import json
import re
from bs4 import BeautifulSoup, Tag


def clean_text(element):
    """Szöveg tisztítása, sortörések megtartásával."""
    return element.get_text(separator="\n", strip=True)


def is_correct_option(element):
    """
    Eldönti, hogy egy elem (li, p, tr) helyes válasz-e.
    Minden lehetséges jelölést (piros szín, félkövér) megvizsgál.
    """
    is_correct = False

    # 1. Piros szín keresése bárhol az elemen belül (ez a legerősebb jel)
    for child in element.descendants:
        if isinstance(child, Tag):
            # Stílus attribútum vizsgálata
            style = (child.get("style") or "").replace(" ", "").lower()
            if "color:#ff0000" in style or "color:#f00" in style or "red" in style:
                is_correct = True
                break
            # Class alapú piros szín (néha előfordul)
            if "red" in (child.get("class") or []):
                is_correct = True
                break

    # 2. Ha nincs piros, nézzük a vastagítást (strong/b)
    if not is_correct:
        strong_tag = element.find(["strong", "b"])
        if strong_tag:
            text = element.get_text(strip=True)
            # Fontos: Ha a vastag szöveg sorszám (pl "203."), akkor az NEM válaszjelölés
            if not re.match(r"^\d+\.", text):
                is_correct = True

    return is_correct


def scrape_exam_data(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    questions_data = []

    # Keressük az összes bekezdést, ami kérdés lehet
    all_paragraphs = soup.find_all("p")

    for p in all_paragraphs:
        full_text = p.get_text(" ", strip=True)

        # Kérdés detektálása: Sorszám + Pont + <strong>
        if p.find("strong") and re.match(r"^\d+\.", full_text):

            q_obj = {
                "question_number": full_text.split(".")[0],
                "question_text": full_text,
                "options": [],
                "correct_answers": [],
                "type": "multiple_choice",
                "explanation": "N/A",
            }

            # Elindulunk a kérdés utáni testvéreken
            curr_element = p.next_sibling

            while curr_element:
                # Csak Tag-ekkel foglalkozunk, üres sorokat átugorjuk
                if not isinstance(curr_element, Tag):
                    curr_element = curr_element.next_sibling
                    continue

                # --- STOP FELTÉTEL: Ha új kérdés jön ---
                if curr_element.name == "p":
                    next_text = curr_element.get_text(strip=True)
                    if curr_element.find("strong") and re.match(r"^\d+\.", next_text):
                        break  # Kilépünk a while-ból, jön a köv. kérdés

                # --- UNIVERZÁLIS KERESÉS ---
                # Nem érdekel minket, hogy a curr_element neve 'div', 'ul', vagy 'table'.
                # Azt nézzük, mi van BENNE.

                # 1. Lista elemek keresése (ez megoldja a 203-ast és a listás kérdéseket)
                # find_all megtalálja akkor is, ha ez egy <ul>, és akkor is, ha egy <div> ami tartalmaz <ul>-t
                found_lis = curr_element.find_all("li")
                if found_lis:
                    for li in found_lis:
                        opt_txt = clean_text(li)
                        if opt_txt:
                            q_obj["options"].append(opt_txt)
                            if is_correct_option(li):
                                q_obj["correct_answers"].append(opt_txt)

                # 2. Táblázat sorok keresése (Matching)
                elif curr_element.name == "table" or curr_element.find("table"):
                    q_obj["type"] = "matching"
                    found_rows = curr_element.find_all("tr")
                    for row in found_rows:
                        cols = row.find_all("td")
                        row_text = " : ".join([clean_text(c) for c in cols])
                        if row_text:
                            q_obj["options"].append(row_text)
                            q_obj["correct_answers"].append(row_text)

                # 3. Bekezdés alapú válaszok (pl. 104-es kérdés)
                # Itt óvatosnak kell lenni, ne vegyük fel a képaláírást vagy a magyarázatot
                elif curr_element.name == "p":
                    classes = curr_element.get("class", [])
                    # Kizárjuk a képaláírásokat (wp-caption-text)
                    if "wp-caption-text" not in classes:
                        opt_txt = clean_text(curr_element)
                        if opt_txt:
                            q_obj["options"].append(opt_txt)
                            if is_correct_option(curr_element):
                                q_obj["correct_answers"].append(opt_txt)

                # 4. DIV alapú válaszok (ha P tag-ek vannak DIV-be csomagolva)
                elif curr_element.name == "div" and "message_box" not in curr_element.get("class", []):
                    # Csak akkor, ha nincsenek benne LI-k (azokat már az 1. pont kezelte)
                    if not found_lis:
                        found_ps = curr_element.find_all("p")
                        for dp in found_ps:
                            if "wp-caption-text" not in dp.get("class", []):
                                opt_txt = clean_text(dp)
                                if opt_txt:
                                    q_obj["options"].append(opt_txt)
                                    if is_correct_option(dp):
                                        q_obj["correct_answers"].append(opt_txt)

                # 5. Magyarázat
                if curr_element.name == "div" and "message_box" in curr_element.get("class", []):
                    q_obj["explanation"] = clean_text(curr_element)

                curr_element = curr_element.next_sibling

            questions_data.append(q_obj)

    return questions_data


# --- Futtatás ---
if __name__ == "__main__":
    input_file = "testanswers.html"
    results = scrape_exam_data(input_file)

    if results:
        print(f"Sikeres feldolgozás: {len(results)} kérdés.\n")

        # Ellenőrzés a problémás kérdésekre
        for q in results:
            if q['question_number'] in ['104', '203']:
                print(f"--- Kérdés {q['question_number']} ---")
                print(f"Szöveg eleje: {q['question_text'][:80]}...")
                print(f"Opciók száma: {len(q['options'])}")
                print(f"Helyes válaszok száma: {len(q['correct_answers'])}")
                print("Helyes válasz(ok):")
                print(q['correct_answers'])
                print("-" * 30)

        with open("extractedCCNA3_questions.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=4)
            print("Mentve: extractedCCNA3_questions.json")
    else:
        print("Nem találtam kérdéseket.")