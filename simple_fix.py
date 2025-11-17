import json
import re


def clean_text(text):
    if not text or text == "N/A":
        return text

    # Replace multiple whitespace (including newlines) with single space
    text = re.sub(r"\s+", " ", text)

    # Remove leading/trailing whitespace
    text = text.strip()

    # Fix spacing around punctuation
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    text = re.sub(r"([.,;:!?])\s*([a-zA-Z])", r"\1 \2", text)

    return text


def fix_questions():
    with open("extracted_questions.json", "r", encoding="utf-8") as f:
        questions = json.load(f)

    # Backup original
    with open("extracted_questions_backup.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

    fixed_questions = []

    for q in questions:
        fixed = {}

        # Clean question number
        fixed["question_number"] = str(q.get("question_number", "")).strip()

        # Clean question text and remove number prefix
        question_text = clean_text(q.get("question_text", ""))
        question_text = re.sub(r"^\d+\.\s*", "", question_text)
        fixed["question_text"] = question_text

        # Clean options
        if "options" in q and q["options"]:
            fixed["options"] = [
                clean_text(opt) for opt in q["options"] if clean_text(opt)
            ]
        else:
            fixed["options"] = []

        # Clean correct answers
        if "correct_answers" in q and q["correct_answers"]:
            fixed["correct_answers"] = [
                clean_text(ans) for ans in q["correct_answers"] if clean_text(ans)
            ]
        else:
            fixed["correct_answers"] = []

        # Clean type
        fixed["type"] = clean_text(q.get("type", "unknown"))

        # Clean explanation and remove prefix
        explanation = clean_text(q.get("explanation", "N/A"))
        explanation = re.sub(r"^Explanation:\s*", "", explanation)
        fixed["explanation"] = explanation

        fixed_questions.append(fixed)

    # Save fixed version
    with open("extracted_questions.json", "w", encoding="utf-8") as f:
        json.dump(fixed_questions, f, indent=2, ensure_ascii=False)

    print(f"Fixed {len(fixed_questions)} questions!")
    print("Original backed up as extracted_questions_backup.json")

    # Show example
    if questions and fixed_questions:
        print("\nExample improvement:")
        print(f"Before: {questions[0]['question_text'][:80]}...")
        print(f"After:  {fixed_questions[0]['question_text'][:80]}...")


if __name__ == "__main__":
    fix_questions()
