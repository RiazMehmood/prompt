"""Gemini AI client for legal queries."""
import google.generativeai as genai
from backend.src.config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiClient:
    """Gemini AI client wrapper for legal assistant."""

    def __init__(self):
        """Initialize Gemini Flash model (free tier)."""
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str = None,
        temperature: float = 0.7
    ) -> str:
        """Generate AI response.

        Args:
            prompt: User query
            system_instruction: System/persona prompt
            temperature: Creativity level (0-1)

        Returns:
            Generated text response
        """
        try:
            # Combine system instruction with prompt
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\nUser Query: {prompt}"

            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=2048,
                )
            )

            return response.text

        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")

    async def generate_embeddings(self, text: str) -> list[float]:
        """Generate text embeddings using Gemini.

        Args:
            text: Text to embed

        Returns:
            768-dimensional embedding vector
        """
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )

            return result["embedding"]

        except Exception as e:
            raise Exception(f"Gemini embedding error: {str(e)}")


# Global client instance
gemini_client = GeminiClient()
