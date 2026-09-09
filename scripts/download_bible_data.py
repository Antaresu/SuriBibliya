import os
import sys
import json
import re
import urllib.request
import zipfile
import io
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

# Canonical 66 Books Definition
BOOKS_METADATA = [
    {"id": 1, "osis": "Gen", "name": "Genesis", "tagalog": "Genesis", "testament": "OT", "category": "Pentateuch", "chapters": 50},
    {"id": 2, "osis": "Exod", "name": "Exodus", "tagalog": "Exodo", "testament": "OT", "category": "Pentateuch", "chapters": 40},
    {"id": 3, "osis": "Lev", "name": "Leviticus", "tagalog": "Levitico", "testament": "OT", "category": "Pentateuch", "chapters": 27},
    {"id": 4, "osis": "Num", "name": "Numbers", "tagalog": "Mga Bilang", "testament": "OT", "category": "Pentateuch", "chapters": 36},
    {"id": 5, "osis": "Deut", "name": "Deuteronomy", "tagalog": "Deuteronomio", "testament": "OT", "category": "Pentateuch", "chapters": 34},
    {"id": 6, "osis": "Josh", "name": "Joshua", "tagalog": "Josue", "testament": "OT", "category": "Kasaysayan", "chapters": 24},
    {"id": 7, "osis": "Judg", "name": "Judges", "tagalog": "Mga Hukom", "testament": "OT", "category": "Kasaysayan", "chapters": 21},
    {"id": 8, "osis": "Ruth", "name": "Ruth", "tagalog": "Ruth", "testament": "OT", "category": "Kasaysayan", "chapters": 4},
    {"id": 9, "osis": "1Sam", "name": "1 Samuel", "tagalog": "1 Samuel", "testament": "OT", "category": "Kasaysayan", "chapters": 31},
    {"id": 10, "osis": "2Sam", "name": "2 Samuel", "tagalog": "2 Samuel", "testament": "OT", "category": "Kasaysayan", "chapters": 24},
    {"id": 11, "osis": "1Kgs", "name": "1 Kings", "tagalog": "1 Mga Hari", "testament": "OT", "category": "Kasaysayan", "chapters": 22},
    {"id": 12, "osis": "2Kgs", "name": "2 Kings", "tagalog": "2 Mga Hari", "testament": "OT", "category": "Kasaysayan", "chapters": 25},
    {"id": 13, "osis": "1Chr", "name": "1 Chronicles", "tagalog": "1 Mga Cronica", "testament": "OT", "category": "Kasaysayan", "chapters": 29},
    {"id": 14, "osis": "2Chr", "name": "2 Chronicles", "tagalog": "2 Mga Cronica", "testament": "OT", "category": "Kasaysayan", "chapters": 36},
    {"id": 15, "osis": "Ezra", "name": "Ezra", "tagalog": "Ezra", "testament": "OT", "category": "Kasaysayan", "chapters": 10},
    {"id": 16, "osis": "Neh", "name": "Nehemiah", "tagalog": "Nehemias", "testament": "OT", "category": "Kasaysayan", "chapters": 13},
    {"id": 17, "osis": "Esth", "name": "Esther", "tagalog": "Ester", "testament": "OT", "category": "Kasaysayan", "chapters": 10},
    {"id": 18, "osis": "Job", "name": "Job", "tagalog": "Job", "testament": "OT", "category": "Mga Tula", "chapters": 42},
    {"id": 19, "osis": "Ps", "name": "Psalms", "tagalog": "Mga Awit", "testament": "OT", "category": "Mga Tula", "chapters": 150},
    {"id": 20, "osis": "Prov", "name": "Proverbs", "tagalog": "Mga Kawikaan", "testament": "OT", "category": "Mga Tula", "chapters": 31},
    {"id": 21, "osis": "Eccl", "name": "Ecclesiastes", "tagalog": "Ang Mangangaral", "testament": "OT", "category": "Mga Tula", "chapters": 12},
    {"id": 22, "osis": "Song", "name": "Song of Solomon", "tagalog": "Ang Awit ni Solomon", "testament": "OT", "category": "Mga Tula", "chapters": 8},
    {"id": 23, "osis": "Isa", "name": "Isaiah", "tagalog": "Isaias", "testament": "OT", "category": "Mga Pangunahing Propeta", "chapters": 66},
    {"id": 24, "osis": "Jer", "name": "Jeremiah", "tagalog": "Jeremias", "testament": "OT", "category": "Mga Pangunahing Propeta", "chapters": 52},
    {"id": 25, "osis": "Lam", "name": "Lamentations", "tagalog": "Mga Panaghoy", "testament": "OT", "category": "Mga Pangunahing Propeta", "chapters": 5},
    {"id": 26, "osis": "Ezek", "name": "Ezekiel", "tagalog": "Ezekiel", "testament": "OT", "category": "Mga Pangunahing Propeta", "chapters": 48},
    {"id": 27, "osis": "Dan", "name": "Daniel", "tagalog": "Daniel", "testament": "OT", "category": "Mga Pangunahing Propeta", "chapters": 12},
    {"id": 28, "osis": "Hos", "name": "Hosea", "tagalog": "Oseas", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 14},
    {"id": 29, "osis": "Joel", "name": "Joel", "tagalog": "Joel", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 3},
    {"id": 30, "osis": "Amos", "name": "Amos", "tagalog": "Amos", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 9},
    {"id": 31, "osis": "Obad", "name": "Obadiah", "tagalog": "Obadias", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 1},
    {"id": 32, "osis": "Jonah", "name": "Jonah", "tagalog": "Jonas", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 4},
    {"id": 33, "osis": "Mic", "name": "Micah", "tagalog": "Mikas", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 7},
    {"id": 34, "osis": "Nah", "name": "Nahum", "tagalog": "Nahum", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 3},
    {"id": 35, "osis": "Hab", "name": "Habakkuk", "tagalog": "Habacuc", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 3},
    {"id": 36, "osis": "Zeph", "name": "Zephaniah", "tagalog": "Zefanias", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 3},
    {"id": 37, "osis": "Hag", "name": "Haggai", "tagalog": "Hagai", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 2},
    {"id": 38, "osis": "Zech", "name": "Zechariah", "tagalog": "Zacarias", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 14},
    {"id": 39, "osis": "Mal", "name": "Malachi", "tagalog": "Malakias", "testament": "OT", "category": "Mga Minor na Propeta", "chapters": 4},
    {"id": 40, "osis": "Matt", "name": "Matthew", "tagalog": "Mateo", "testament": "NT", "category": "Mga Ebanghelyo", "chapters": 28},
    {"id": 41, "osis": "Mark", "name": "Mark", "tagalog": "Marcos", "testament": "NT", "category": "Mga Ebanghelyo", "chapters": 16},
    {"id": 42, "osis": "Luke", "name": "Luke", "tagalog": "Lucas", "testament": "NT", "category": "Mga Ebanghelyo", "chapters": 24},
    {"id": 43, "osis": "John", "name": "John", "tagalog": "Juan", "testament": "NT", "category": "Mga Ebanghelyo", "chapters": 21},
    {"id": 44, "osis": "Acts", "name": "Acts", "tagalog": "Mga Gawa", "testament": "NT", "category": "Kasaysayan ng NT", "chapters": 28},
    {"id": 45, "osis": "Rom", "name": "Romans", "tagalog": "Mga Taga-Roma", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 16},
    {"id": 46, "osis": "1Cor", "name": "1 Corinthians", "tagalog": "1 Mga Taga-Corinto", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 16},
    {"id": 47, "osis": "2Cor", "name": "2 Corinthians", "tagalog": "2 Mga Taga-Corinto", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 13},
    {"id": 48, "osis": "Gal", "name": "Galatians", "tagalog": "Mga Taga-Galacia", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 6},
    {"id": 49, "osis": "Eph", "name": "Ephesians", "tagalog": "Mga Taga-Efeso", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 6},
    {"id": 50, "osis": "Phil", "name": "Philippians", "tagalog": "Mga Taga-Filipos", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 4},
    {"id": 51, "osis": "Col", "name": "Colossians", "tagalog": "Mga Taga-Colosas", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 4},
    {"id": 52, "osis": "1Thess", "name": "1 Thessalonians", "tagalog": "1 Mga Taga-Tesalonica", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 5},
    {"id": 53, "osis": "2Thess", "name": "2 Thessalonians", "tagalog": "2 Mga Taga-Tesalonica", "testament": "NT", "category": "Mga Sulat ni Pablo", "chapters": 3},
    {"id": 54, "osis": "1Tim", "name": "1 Timothy", "tagalog": "1 Timoteo", "testament": "NT", "category": "Pastoral na Sulat", "chapters": 6},
    {"id": 55, "osis": "2Tim", "name": "2 Timothy", "tagalog": "2 Timoteo", "testament": "NT", "category": "Pastoral na Sulat", "chapters": 4},
    {"id": 56, "osis": "Titus", "name": "Titus", "tagalog": "Tito", "testament": "NT", "category": "Pastoral na Sulat", "chapters": 3},
    {"id": 57, "osis": "Phlm", "name": "Philemon", "tagalog": "Filemon", "testament": "NT", "category": "Pastoral na Sulat", "chapters": 1},
    {"id": 58, "osis": "Heb", "name": "Hebrews", "tagalog": "Mga Hebreo", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 13},
    {"id": 59, "osis": "Jas", "name": "James", "tagalog": "Santiago", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 5},
    {"id": 60, "osis": "1Pet", "name": "1 Peter", "tagalog": "1 Pedro", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 5},
    {"id": 61, "osis": "2Pet", "name": "2 Peter", "tagalog": "2 Pedro", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 3},
    {"id": 62, "osis": "1John", "name": "1 John", "tagalog": "1 Juan", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 5},
    {"id": 63, "osis": "2John", "name": "2 John", "tagalog": "2 Juan", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 1},
    {"id": 64, "osis": "3John", "name": "3 John", "tagalog": "3 Juan", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 1},
    {"id": 65, "osis": "Jude", "name": "Jude", "tagalog": "Judas", "testament": "NT", "category": "Pangkalahatang Sulat", "chapters": 1},
    {"id": 66, "osis": "Rev", "name": "Revelation", "tagalog": "Pahayag", "testament": "NT", "category": "Apocalipsis", "chapters": 22}
]

OSIS_TO_BOOK = {b["osis"]: b for b in BOOKS_METADATA}
ID_TO_BOOK = {b["id"]: b for b in BOOKS_METADATA}

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "bible_data"))
BOOKS_DIR = os.path.join(BASE_DIR, "books")
STRONGS_DIR = os.path.join(BASE_DIR, "strongs")

os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(BOOKS_DIR, exist_ok=True)
os.makedirs(STRONGS_DIR, exist_ok=True)

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "cache"))
os.makedirs(CACHE_DIR, exist_ok=True)

def fetch_url(url):
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', url.split('/')[-1] if not url.endswith('/') else 'index')
    cache_path = os.path.join(CACHE_DIR, filename)
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
        print(f"Loading from cache: {filename}")
        with open(cache_path, 'rb') as f:
            return f.read()
    print(f"Downloading {url} ...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        with open(cache_path, 'wb') as f:
            f.write(data)
        return data

def download_tagalog():
    """Download and parse Ang Dating Biblia 1905 OSIS XML."""
    url = 'https://raw.githubusercontent.com/seven1m/open-bibles/master/tgl-tagalog.osis.xml'
    raw_data = fetch_url(url)
    root = ET.fromstring(raw_data)
    ns = {'osis': 'http://www.bibletechnologies.net/2003/OSIS/namespace'}
    
    # Map (book_id, chapter, verse) -> text
    verses_map = {}
    for elem in root.findall('.//osis:verse', ns):
        oid = elem.get('osisID', '')
        parts = oid.split('.')
        if len(parts) == 3:
            osis_book, ch_s, v_s = parts[0], parts[1], parts[2]
            if osis_book in OSIS_TO_BOOK:
                book_id = OSIS_TO_BOOK[osis_book]["id"]
                try:
                    ch, v = int(ch_s), int(v_s)
                    # Text inside verse element (and child texts if any)
                    text = "".join(elem.itertext()).strip()
                    verses_map[(book_id, ch, v)] = text
                except ValueError:
                    pass
    print(f"Tagalog ADB parsed: {len(verses_map)} verses.")
    return verses_map

def download_bolls_translation(code):
    """Download JSON translation from bolls.life."""
    url = f'https://bolls.life/static/translations/{code}.json'
    raw_data = fetch_url(url)
    data = json.loads(raw_data.decode('utf-8'))
    
    # Map (book_id, chapter, verse) -> text
    verses_map = {}
    for item in data:
        b = item.get('book')
        ch = item.get('chapter')
        v = item.get('verse')
        t = item.get('text', '').strip()
        if b in ID_TO_BOOK:
            verses_map[(b, ch, v)] = t
    print(f"{code} parsed: {len(verses_map)} verses.")
    return verses_map

def download_cross_references():
    """Download OpenBible cross references and index by (book_id, chapter, verse)."""
    url = 'https://a.openbible.info/data/cross-references.zip'
    raw_data = fetch_url(url)
    z = zipfile.ZipFile(io.BytesIO(raw_data))
    filename = z.namelist()[0]
    
    cross_refs = {}
    with z.open(filename) as f:
        for line in io.TextIOWrapper(f, encoding='utf-8'):
            if line.startswith('#') or line.startswith('From Verse') or not line.strip():
                continue
            parts = line.strip().split('\t')
            if len(parts) >= 3:
                from_v, to_v, votes = parts[0], parts[1], parts[2]
                from_parts = from_v.split('.')
                if len(from_parts) == 3 and from_parts[0] in OSIS_TO_BOOK:
                    b_id = OSIS_TO_BOOK[from_parts[0]]["id"]
                    ch, v = int(from_parts[1]), int(from_parts[2])
                    key = (b_id, ch, v)
                    if key not in cross_refs:
                        cross_refs[key] = []
                    # Keep top 12 cross references per verse to maintain optimal file sizes
                    if len(cross_refs[key]) < 12:
                        cross_refs[key].append({
                            "to": to_v,
                            "votes": int(votes)
                        })
    print(f"Cross references parsed for {len(cross_refs)} verses.")
    return cross_refs

def download_strongs():
    """Download Strong's Greek and Hebrew Dictionaries."""
    # Greek
    greek_url = 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js'
    greek_raw = fetch_url(greek_url).decode('utf-8')
    m_grk = re.search(r'var\s+\w+\s*=\s*(\{.*\});', greek_raw, re.DOTALL)
    if m_grk:
        greek_data = json.loads(m_grk.group(1))
        # Simplify & compact entry fields
        compact_greek = {}
        for k, v in greek_data.items():
            compact_greek[k] = {
                "lemma": v.get("lemma", ""),
                "xlit": v.get("xlit", ""),
                "pron": v.get("pron", ""),
                "derivation": v.get("derivation", ""),
                "def": v.get("strongs_def", ""),
                "kjv": v.get("kjv_def", "")
            }
        with open(os.path.join(STRONGS_DIR, "greek.json"), 'w', encoding='utf-8') as f:
            json.dump(compact_greek, f, ensure_ascii=False)
        print(f"Saved Strong's Greek dictionary: {len(compact_greek)} entries.")

    # Hebrew
    hebrew_url = 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js'
    hebrew_raw = fetch_url(hebrew_url).decode('utf-8')
    m_heb = re.search(r'var\s+\w+\s*=\s*(\{.*\});', hebrew_raw, re.DOTALL)
    if m_heb:
        hebrew_data = json.loads(m_heb.group(1))
        compact_hebrew = {}
        for k, v in hebrew_data.items():
            compact_hebrew[k] = {
                "lemma": v.get("lemma", ""),
                "xlit": v.get("xlit", ""),
                "pron": v.get("pron", ""),
                "derivation": v.get("derivation", ""),
                "def": v.get("strongs_def", ""),
                "kjv": v.get("kjv_def", "")
            }
        with open(os.path.join(STRONGS_DIR, "hebrew.json"), 'w', encoding='utf-8') as f:
            json.dump(compact_hebrew, f, ensure_ascii=False)
        print(f"Saved Strong's Hebrew dictionary: {len(compact_hebrew)} entries.")

def main():
    print("=== STARTING SURI-BIBLIYA DATA INGESTION ===")
    
    # Save books metadata
    with open(os.path.join(BASE_DIR, "books.json"), 'w', encoding='utf-8') as f:
        json.dump(BOOKS_METADATA, f, indent=2, ensure_ascii=False)
    print("Saved books.json")

    # 1. Download Tagalog ADB 1905
    adb_verses = download_tagalog()

    # 2. Download KJV with Strong's tags
    kjv_verses = download_bolls_translation('KJV')

    # 3. Download Hebrew WLCa (OT with Strong's)
    wlc_verses = download_bolls_translation('WLCa')

    # 4. Download Greek TISCH (NT with Strong's)
    tr_verses = download_bolls_translation('TISCH')

    # 5. Download Cross-references
    cross_refs = download_cross_references()

    # 6. Download Strong's Dictionaries
    download_strongs()

    # 7. Compile per-book JSON files
    print("Compiling per-book JSON files...")
    search_index = [] # Lightweight search index: [{"b": 1, "c": 1, "v": 1, "tgl": "...", "en": "..."}]

    for b in BOOKS_METADATA:
        book_id = b["id"]
        book_osis = b["osis"]
        num_chapters = b["chapters"]
        is_ot = (b["testament"] == "OT")
        
        book_data = {
            "metadata": b,
            "chapters": {}
        }

        for ch in range(1, num_chapters + 1):
            # Gather all verses for this chapter
            chapter_verses = []
            v_num = 1
            while True:
                key = (book_id, ch, v_num)
                adb_text = adb_verses.get(key, "")
                kjv_text = kjv_verses.get(key, "")
                orig_dict = wlc_verses if is_ot else tr_verses
                orig_text = orig_dict.get(key, "")

                if not adb_text and not kjv_text and not orig_text:
                    # Check if chapter ended or if there's any subsequent verse
                    next_key = (book_id, ch, v_num + 1)
                    if next_key not in adb_verses and next_key not in kjv_verses and next_key not in orig_dict:
                        break

                v_cross = cross_refs.get(key, [])
                
                v_entry = {
                    "v": v_num,
                    "adb": adb_text,
                    "kjv": kjv_text,
                    "orig": orig_text,
                    "refs": v_cross
                }
                chapter_verses.append(v_entry)

                # Add to search index (clean Strong's tags from KJV text for search)
                clean_kjv = re.sub(r'<S>\d+</S>', '', kjv_text).strip()
                search_index.append({
                    "b": book_id,
                    "c": ch,
                    "v": v_num,
                    "tgl": adb_text,
                    "en": clean_kjv
                })

                v_num += 1

            book_data["chapters"][str(ch)] = chapter_verses

        # Write book JSON
        book_file = os.path.join(BOOKS_DIR, f"{book_id}.json")
        with open(book_file, 'w', encoding='utf-8') as f:
            json.dump(book_data, f, ensure_ascii=False)
        print(f"Saved book {book_id}: {b['name']} ({b['tagalog']}) - {len(book_data['chapters'])} chapters.")

    # Save search index (compressed without extra spaces)
    search_file = os.path.join(BASE_DIR, "search_index.json")
    with open(search_file, 'w', encoding='utf-8') as f:
        json.dump(search_index, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Saved search index with {len(search_index)} total verses!")

    print("=== SURI-BIBLIYA DATA INGESTION COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    main()
