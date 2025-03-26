from fastapi import FastAPI, File, UploadFile, HTTPException, Form
import google.generativeai as genai
from PIL import Image
import io
import json
import re
import os
import uvicorn
from enum import Enum

app = FastAPI()

# Secure API key retrieval
api_key = os.getenv("google-api")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY is not set in the environment variables.")
genai.configure(api_key=api_key)

class AnalysisType(str, Enum):
    DETECT_ALLERGENS = "detect_allergens"
    DETAILED_NUTRIENT_INFO = "detailed_nutrient_info"
    LEARN_ABOUT_FOOD = "learn_about_food"
    FUN_FACTS = "fun_facts"
    GENERATE_DISH = "generate_dish"

@app.get("/")
def read_root():
    return {"message": "Food Analysis API is running!"}

@app.head("/")
async def root_head():
    return {}  # Empty response for HEAD requests

@app.post("/analyze-food")
async def analyze_food_image(
    file: UploadFile = File(...),
    analysis_type: AnalysisType = Form(...)
):
    """Analyzes food items in the image based on the selected analysis type"""
    
    # Read the uploaded image file
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))

    # Load the generative model
    model = genai.GenerativeModel("gemini-2.0-flash")  # Optimized for real-time image processing

    # Define prompts based on analysis type
    prompts = {
        AnalysisType.DETECT_ALLERGENS: """
        Identify all food items in the given image and list potential allergens.
        Return the response in valid JSON format following this structure:
        
        ```json
        {
          "detected_food_items": [
            {
              "food_item": "Detected food name",
              "quantity": "Approximate quantity",
              "potential_allergens": ["allergen1", "allergen2"],
              "allergen_severity": {
                "allergen1": "high/medium/low",
                "allergen2": "high/medium/low"
              },
              "common_cross_reactivity": ["other allergen1", "other allergen2"]
            }
          ]
        }
        ```
        
        Ensure the response is valid JSON inside triple backticks.
        """,
        
        AnalysisType.DETAILED_NUTRIENT_INFO: """
        Identify all food items in the given image and provide comprehensive nutritional information.
        Return the response in valid JSON format following this structure:
        
        ```json
        {
          "detected_food_items": [
            {
              "food_item": "Detected food name",
              "quantity": "Approximate quantity",
              "nutritional_info": {
                "calories_kcal": value,
                "protein_g": value,
                "carbohydrates_g": value,
                "fat_g": value,
                "fiber_g": value,
                "sugar_g": value,
                "sodium_mg": value,
                "potassium_mg": value,
                "calcium_mg": value,
                "iron_mg": value,
                "vitamins": {
                  "Vitamin A_mcg": value,
                  "Vitamin C_mg": value,
                  "Vitamin D_mcg": value,
                  "Vitamin E_mg": value,
                  "Vitamin K_mcg": value,
                  "Vitamin B1_mg": value,
                  "Vitamin B2_mg": value,
                  "Vitamin B3_mg": value,
                  "Vitamin B6_mg": value,
                  "Vitamin B12_mcg": value,
                  "Folate_mcg": value
                },
                "minerals": {
                  "Magnesium_mg": value,
                  "Zinc_mg": value,
                  "Selenium_mcg": value,
                  "Phosphorus_mg": value
                }
              },
              "glycemic_index": value,
              "macronutrient_ratio": {
                "protein_percent": value,
                "carbs_percent": value,
                "fat_percent": value
              }
            }
          ],
          "total_meal_nutrition": {
            "calories_kcal": value,
            "protein_g": value,
            "carbohydrates_g": value,
            "fat_g": value
          }
        }
        ```
        
        Ensure the response is valid JSON inside triple backticks.
        """,
        
        AnalysisType.LEARN_ABOUT_FOOD: """
        Identify all food items in the given image and provide educational information about them.
        Return the response in valid JSON format following this structure:
        
        ```json
        {
          "detected_food_items": [
            {
              "food_item": "Detected food name",
              "origin": "Geographic origin of the food",
              "cultural_significance": "Brief description of cultural importance",
              "history": "Brief history of the food",
              "preparation_methods": ["method1", "method2"],
              "key_ingredients": ["ingredient1", "ingredient2"],
              "nutritional_highlights": ["highlight1", "highlight2"],
              "health_benefits": ["benefit1", "benefit2"],
              "interesting_facts": ["fact1", "fact2"]
            }
          ]
        }
        ```
        
        Ensure the response is valid JSON inside triple backticks.
        """,
        
        AnalysisType.FUN_FACTS: """
        Identify all food items in the given image and provide fun and interesting facts about them.
        Return the response in valid JSON format following this structure:
        
        ```json
        {
          "detected_food_items": [
            {
              "food_item": "Detected food name",
              "fun_facts": [
                "Fun fact 1 about this food",
                "Fun fact 2 about this food",
                "Fun fact 3 about this food"
              ],
              "did_you_know": "An interesting surprising fact",
              "world_records": ["Any world records related to this food"],
              "pop_culture_references": ["How this food appears in movies, TV, etc."],
              "weird_traditions": ["Strange traditions involving this food"]
            }
          ]
        }
        ```
        
        Ensure the response is valid JSON inside triple backticks.
        """,
        
        AnalysisType.GENERATE_DISH: """
        Identify all food items in the given image and suggest creative dishes that can be made with them.
        Return the response in valid JSON format following this structure:
        
        ```json
        {
          "detected_ingredients": ["ingredient1", "ingredient2"],
          "suggested_dishes": [
            {
              "dish_name": "Creative dish name",
              "cuisine_type": "Type of cuisine",
              "difficulty_level": "easy/medium/hard",
              "preparation_time_minutes": value,
              "ingredients": {
                "from_image": ["ingredient1", "ingredient2"],
                "additional_needed": ["extra1", "extra2"]
              },
              "recipe_steps": [
                "Step 1 description",
                "Step 2 description"
              ],
              "nutritional_highlights": ["highlight1", "highlight2"],
              "serving_suggestions": ["suggestion1", "suggestion2"]
            }
          ]
        }
        ```
        
        Ensure the response is valid JSON inside triple backticks.
        """
    }

    # Get the appropriate prompt
    prompt = prompts.get(analysis_type)
    if not prompt:
        raise HTTPException(status_code=400, detail="Invalid analysis type")

    # Get response from API
    response = model.generate_content([prompt, img])

    # Extract JSON response
    try:
        # Use regex to extract JSON block
        match = re.search(r'```json\s*(\{.*?\})\s*```', response.text, re.DOTALL)
        if match:
            json_response = match.group(1)  # Extract JSON content
            return json.loads(json_response)  # Convert to Python dictionary
        else:
            return {"error": "Response does not contain valid JSON format", "raw_response": response.text}
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON response", "raw_response": response.text}

# Keep the original analyze endpoint for backward compatibility
@app.post("/analyze")
async def analyze_food_image_original(file: UploadFile = File()):
    """Analyzes food items in the image using Gemini 1.5 Flash (original endpoint)"""
    
    # Read the uploaded image file
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))

    # Load the generative model
    model = genai.GenerativeModel("gemini-2.0-flash")  # Optimized for real-time image processing

    # Updated structured JSON prompt
    prompt = """
    Identify all food items in the given image and determine their approximate quantity. Then, provide nutritional information 
    in valid JSON format following this structure:

    ```json
    {
      "detected_food_items": [
        {
          "food_item": "Detected food name",
          "quantity": "Approximate quantity (e.g., 1 bowl, 2 slices, half a chapati)",
          "nutritional_info": {
            "calories_kcal": value,
            "protein_g": value,
            "fiber_g": value,
            "vitamins": {
              "Vitamin A_mcg": value,
              "Vitamin C_mg": value,
              "Vitamin D_mcg": value,
              "Vitamin E_mg": value,
              "Vitamin K_mcg": value,
              "Vitamin B1_mg": value,
              "Vitamin B2_mg": value,
              "Vitamin B3_mg": value,
              "Vitamin B6_mg": value,
              "Vitamin B12_mcg": value,
              "Folate_mcg": value
            }
          },
          "health_benefits": [
            "Brief description of health benefit 1",
            "Brief description of health benefit 2"
          ]
        }
      ]
    }
    ```

    - **Ensure the response is valid JSON** inside triple backticks (```json ... ```).
    - **Include accurate nutritional values based on the given quantity.**
    - **If exact values are unavailable, provide estimated values.**
    - **Ensure proper formatting and completeness of data.**
    """

    # Get response from API
    response = model.generate_content([prompt, img])

    # Extract JSON response
    try:
        # Use regex to extract JSON block
        match = re.search(r'```json\s*(\{.*?\})\s*```', response.text, re.DOTALL)
        if match:
            json_response = match.group(1)  # Extract JSON content
            return json.loads(json_response)  # Convert to Python dictionary
        else:
            return {"error": "Response does not contain valid JSON format", "raw_response": response.text}
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON response", "raw_response": response.text}

# Entry point for Render deployment
if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))  # Render assigns PORT dynamically
    uvicorn.run(app, host="0.0.0.0", port=port)