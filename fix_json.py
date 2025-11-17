import json
import re


def clean_text(text):
    """Clean text by removing excessive whitespace and fixing line breaks."""
    if not text or text == "N/A":
        return text

    # Remove excessive whitespace and newlines
    text = re.sub(r"\s+", " ", text)

    # Remove leading/trailing whitespace
    text = text.strip()

    # Fix common formatting issues
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)  # Remove space before punctuation
    text = re.sub(
        r"([.,;:!?])\s*([a-zA-Z])", r"\1 \2", text
    )  # Ensure space after punctuation

    return text


def clean_question_data(questions):
    """Clean all text fields in question data."""
    cleaned_questions = []

    for question in questions:
        cleaned_question = {}

        # Clean question number
        cleaned_question["question_number"] = str(
            question.get("question_number", "")
        ).strip()

        # Clean question text
        question_text = clean_text(question.get("question_text", ""))
        # Remove question number from beginning if it exists
        question_text = re.sub(r"^\d+\.\s*", "", question_text)
        cleaned_question["question_text"] = question_text

        # Clean options
        if "options" in question and question["options"]:
            cleaned_options = []
            for option in question["options"]:
                cleaned_option = clean_text(option)
                if cleaned_option:  # Only add non-empty options
                    cleaned_options.append(cleaned_option)
            cleaned_question["options"] = cleaned_options
        else:
            cleaned_question["options"] = []

        # Clean correct answers
        if "correct_answers" in question and question["correct_answers"]:
            cleaned_answers = []
            for answer in question["correct_answers"]:
                cleaned_answer = clean_text(answer)
                if cleaned_answer:  # Only add non-empty answers
                    cleaned_answers.append(cleaned_answer)
            cleaned_question["correct_answers"] = cleaned_answers
        else:
            cleaned_question["correct_answers"] = []

        # Clean question type
        cleaned_question["type"] = clean_text(question.get("type", "unknown"))

        # Clean explanation
        explanation = clean_text(question.get("explanation", "N/A"))
        # Remove "Explanation:" prefix if it exists
        explanation = re.sub(r"^Explanation:\s*", "", explanation)
        cleaned_question["explanation"] = explanation

        cleaned_questions.append(cleaned_question)

    return cleaned_questions


def main():
    """Main function to clean the JSON file."""
    input_file = "extracted_questions.json"
    output_file = "extracted_questions_cleaned.json"
    backup_file = "extracted_questions_backup.json"

    try:
        print("Loading questions from JSON file...")
        with open(input_file, "r", encoding="utf-8") as f:
            questions = json.load(f)

        print(f"Loaded {len(questions)} questions")

        # Create backup
        print("Creating backup...")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)

        # Clean the questions
        print("Cleaning question data...")
        cleaned_questions = clean_question_data(questions)

        # Save cleaned version
        print("Saving cleaned questions...")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(cleaned_questions, f, indent=2, ensure_ascii=False)

        print(f"✅ Successfully cleaned {len(cleaned_questions)} questions!")
        print(f"📁 Original file backed up as: {backup_file}")
        print(f"📁 Cleaned file saved as: {output_file}")

        # Show some examples
        print("\n📋 Example of improvements:")
        if questions and cleaned_questions:
            original_text = questions[0].get("question_text", "")[:100]
            cleaned_text = cleaned_questions[0].get("question_text", "")[:100]

            print(f"Before: {original_text}...")
            print(f"After:  {cleaned_text}...")

        # Replace original file
        replace = (
            input("\n❓ Replace original file with cleaned version? (y/n): ")
            .lower()
            .strip()
        )
        if replace in ["y", "yes"]:
            with open(input_file, "w", encoding="utf-8") as f:
                json.dump(cleaned_questions, f, indent=2, ensure_ascii=False)
            print(f"✅ Original file updated!")
        else:
            print(
                f"Original file kept unchanged. Use {output_file} for the cleaned version."
            )

    except FileNotFoundError:
        print(f"❌ Error: Could not find {input_file}")
        print("Make sure the file exists in the same directory as this script.")
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format in {input_file}")
        print(f"Error details: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


if __name__ == "__main__":
    main()
