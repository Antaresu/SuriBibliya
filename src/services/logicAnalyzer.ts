import { BookMetadata, Verse, ExegesisAnalysis, LogicConnective, LogicSyllogism } from '../types/bible';

const TAGALOG_CONNECTIVES: Array<{ regex: RegExp; word: string; type: LogicConnective['type']; meaning: string }> = [
  { regex: /\b(sapagkat|yamang|palibhasa|dahil sa|dahilan sa)\b/i, word: 'Sapagkat / Yamang', type: 'cause', meaning: 'Nagpapahayag ng sanhi, batayan o foundational premise ng katotohanan.' },
  { regex: /\b(samakatuwid|kaya nga|dahil dito|kung gayon|sa gayo'y)\b/i, word: 'Kaya nga / Samakatuwid', type: 'inference', meaning: 'Lohikal na paghihinuha (conclusion/deduction) mula sa naunang mga talata.' },
  { regex: /\b(ngunit|datapwa't|subalit|bagkus|kahit)\b/i, word: 'Ngunit / Datapwa\'t', type: 'contrast', meaning: 'Antithesis o pagbabago ng direksyon ng kaisipan; nagtatakda ng hangganan ng argumento.' },
  { regex: /\b(kung|sakaling)\b/i, word: 'Kung', type: 'condition', meaning: 'Kondisyonal na pahayag (Conditional Premise: Kung A, kung magkagayon B).' },
  { regex: /\b(upang|nang sa gayon|sa layuning)\b/i, word: 'Upang', type: 'purpose', meaning: 'Telos o layunin/kinalabasan ng panukala ng Diyos o kilos ng tao.' }
];

const ENGLISH_CONNECTIVES: Array<{ regex: RegExp; word: string; type: LogicConnective['type']; meaning: string }> = [
  { regex: /\b(for|because|since|inasmuch as)\b/i, word: 'For / Because', type: 'cause', meaning: 'Gives the theological foundation or premise for the statement.' },
  { regex: /\b(therefore|wherefore|so then|consequently)\b/i, word: 'Therefore / Wherefore', type: 'inference', meaning: 'Logical consequence or practical application derived from theological premise.' },
  { regex: /\b(but|nevertheless|yet|however)\b/i, word: 'But / Nevertheless', type: 'contrast', meaning: 'Theological contrast, sovereign intervention, or reversal of human expectation.' },
  { regex: /\b(if|unless|provided)\b/i, word: 'If / Unless', type: 'condition', meaning: 'Covenantal conditional clause (Protasis).' },
  { regex: /\b(that|so that|in order that|to the end that)\b/i, word: 'So that / In order that', type: 'purpose', meaning: 'Divine intent, ultimate design, or teleological goal.' }
];

class LogicAnalyzerService {
  // Extract discourse connectives from verse texts
  extractConnectives(adbText: string, kjvText: string): LogicConnective[] {
    const found: LogicConnective[] = [];
    const seen = new Set<string>();

    for (const c of TAGALOG_CONNECTIVES) {
      if (c.regex.test(adbText) && !seen.has(c.word)) {
        found.push({ word: c.word, type: c.type, meaning: c.meaning });
        seen.add(c.word);
      }
    }

    for (const c of ENGLISH_CONNECTIVES) {
      if (c.regex.test(kjvText) && !seen.has(c.word)) {
        found.push({ word: c.word, type: c.type, meaning: c.meaning });
        seen.add(c.word);
      }
    }

    return found;
  }

  // Construct systematic syllogistic breakdown
  generateSyllogism(book: BookMetadata, verse: Verse, lang: 'tl' | 'en' = 'tl'): LogicSyllogism {
    const cleanAdb = verse.adb.replace(/[0-9:]+/g, '').trim();
    const cleanKjv = verse.kjv.replace(/<S>\d+<\/S>/g, '').trim();

    if (lang === 'en') {
      if (book.testament === 'NT' && (book.category.includes('Pablo') || book.category.includes('Sulat') || book.category.includes('Epistle'))) {
        return {
          majorPremise: `The sovereign will and holy righteousness of God defines the absolute foundation for redemption and faith (${book.name}).`,
          minorPremise: `In this verse: "${cleanKjv.substring(0, 100)}..."`,
          conclusion: `Therefore, the believer is summoned to unwavering trust and conduct conforming to divine grace and truth.`,
          validityNote: `Epistolary Deductive Logic (Modus Ponens): Deriving practical Christian sanctification from unshakeable theological doctrine.`
        };
      } else if (book.category.includes('Ebanghelyo') || book.category.includes('Gospel')) {
        return {
          majorPremise: `Jesus Christ is the divine fulfillment of Old Testament prophecies and the Son of God inaugurating the Kingdom of Heaven.`,
          minorPremise: `Proclamation or deed of Christ: "${cleanKjv.substring(0, 100)}..."`,
          conclusion: `Therefore, His words bear supreme divine authority demanding reverent faith, submission, and lifelong discipleship.`,
          validityNote: `Christocentric Prophetic Logic: Biblical typological fulfillment and revelation of Christ's divine character.`
        };
      } else if (book.category.includes('Tula') || book.osis === 'Ps' || book.osis === 'Prov' || book.category.includes('Poetry')) {
        return {
          majorPremise: `The fear of the LORD and trusting in His righteous justice is the fountainhead of all genuine wisdom and enduring peace.`,
          minorPremise: `Declaration of the psalmist or sage: "${cleanKjv.substring(0, 100)}..."`,
          conclusion: `Therefore, whoever seeks life apart from God walks in folly, while the upright are guarded and blessed by His covenant faithfulness.`,
          validityNote: `Hebrew Poetic Parallelism (Synthetic/Antithetical): Alignment of sovereign cosmic reality with the posture of the human heart.`
        };
      } else {
        return {
          majorPremise: `The LORD God is the Sovereign Creator, Sustainer, and Ruler over the history and redemption of His people.`,
          minorPremise: `Historical revelation in this verse: "${cleanKjv.substring(0, 100)}..."`,
          conclusion: `Therefore, His covenant oaths, promises, and commandments stand unbroken throughout all generations.`,
          validityNote: `Covenantal Historical Logic: God's steadfast love (Hesed) prevailing through human weakness and divine fidelity.`
        };
      }
    }

    // Default Tagalog
    if (book.testament === 'NT' && (book.category.includes('Pablo') || book.category.includes('Sulat'))) {
      return {
        majorPremise: `Ang banal na kalooban at katwiran ng Diyos ang nagtatakda ng katotohanan ukol sa kaligtasan at pananampalataya (${book.name}).`,
        minorPremise: `Sa talatang ito: "${cleanAdb.substring(0, 100)}..."`,
        conclusion: `Samakatuwid, ang mananampalataya ay tinatawag sa tiyak na pagtitiwala at pamumuhay na naaayon sa grasya at katuwiran ng Diyos.`,
        validityNote: `Epistolary Deductive Logic (Modus Ponens): Mula sa pangkalahatang doktrina patungo sa tiyak na tungkulin ng buhay Cristiano.`
      };
    } else if (book.category.includes('Ebanghelyo')) {
      return {
        majorPremise: `Si Jesu-Cristo ang katuparan ng mga hula sa Lumang Tipan at ang Anak ng Diyos na naghahayag ng Kaharian ng Langit.`,
        minorPremise: `Pahayag o gawa ni Jesus: "${cleanAdb.substring(0, 100)}..."`,
        conclusion: `Samakatuwid, ang Kaniyang mga salita ay may kataas-taasang kapamahalaan na humihingi ng pananampalataya at pagsunod.`,
        validityNote: `Christocentric Prophetic Logic: Pagtupad sa Kasulatan at paghahayag ng Banal na Katangian ni Cristo.`
      };
    } else if (book.category.includes('Tula') || book.osis === 'Ps' || book.osis === 'Prov') {
      return {
        majorPremise: `Ang takot sa Panginoon at pagtitiwala sa Kaniyang katarungan ang simula ng tunay na karunungan at kapayapaan.`,
        minorPremise: `Karanasan ng salmista o pantas: "${cleanAdb.substring(0, 100)}..."`,
        conclusion: `Samakatuwid, ang sinumang sumusubok mamuhay nang hiwalay sa Diyos ay mapapahamak, ngunit ang tapat ay pinagpapala.`,
        validityNote: `Hebrew Poetic Parallelism (Synthetic/Antithetical): Pagtutugma ng banal na prinsipyo sa kalagayan ng puso ng tao.`
      };
    } else {
      return {
        majorPremise: `Ang Panginoong Diyos ang Soberanong Lumikha at Tagapamahala ng kasaysayan ng Kaniyang bayan.`,
        minorPremise: `Pahayag sa kasaysayan: "${cleanAdb.substring(0, 100)}..."`,
        conclusion: `Samakatuwid, ang Kaniyang mga tipan, pangako, at babala ay hindi masisira at dapat tuparin.`,
        validityNote: `Covenantal Historical Logic: Katapatan ng Diyos (Hesed) sa kabila ng kahinaan ng tao.`
      };
    }
  }

  // Category English translator
  getEnglishCategory(category: string): string {
    const map: Record<string, string> = {
      'Pentateuko / Batas': 'Pentateuch / Law',
      'Kasaysayan': 'Historical Books',
      'Karunungan at Tula': 'Wisdom & Poetry',
      'Pangunahing Propeta': 'Major Prophets',
      'Mababang Propeta': 'Minor Prophets',
      'Mga Ebanghelyo': 'Gospels',
      'Kasaysayan ng Simbahan': 'Church History',
      'Mga Sulat ni Pablo': 'Pauline Epistles',
      'Mga Pangkalahatang Sulat': 'General Epistles',
      'Pangitain / Propesiya': 'Apocalyptic / Prophecy'
    };
    return map[category] || category;
  }

  // Analyze passage exegesis
  analyzePassage(book: BookMetadata, chapter: number, verse: Verse, lang: 'tl' | 'en' = 'tl'): ExegesisAnalysis {
    const connectives = this.extractConnectives(verse.adb, verse.kjv);
    const syllogism = this.generateSyllogism(book, verse, lang);
    const isOT = book.testament === 'OT';

    const nuances: string[] = [];
    if (lang === 'en') {
      if (isOT) {
        nuances.push('Composed in Classical Biblical Hebrew. Note the triconsonantal root words conveying concrete dynamic imagery.');
        nuances.push('Inspect covenantal terminology such as Hesed (steadfast covenant loyalty), Berit (binding covenant), and Shalom (wholeness/peace).');
      } else {
        nuances.push('Composed in Koine Greek. Examine verbal aspect (Aorist tense denoting punctiliar/completed action vs. Present active denoting progressive state).');
        nuances.push('Analyze governing prepositions (e.g. "en Christo" — in Christ, "dia pisteos" — through faith).');
      }

      return {
        reference: `${book.name} ${chapter}:${verse.v}`,
        genre: this.getEnglishCategory(book.category),
        historicalContext: `Belongs to the ${book.testament === 'OT' ? 'Old Testament' : 'New Testament'}, in the book of ${book.name}.`,
        connectivesFound: connectives,
        syllogism,
        keyThemes: ['Sovereignty of God', 'Doctrine & Truth', 'Life of Faith', 'Covenant Promise'],
        originalNuances: nuances,
        hermeneuticalApplication: `How does this point typologically or directly to Christ, and how does it inform Christian thought and practice today?`
      };
    }

    if (isOT) {
      nuances.push('Nakasulat sa Sinaunang Hebreo (Biblical Hebrew). Bigyang pansin ang "Root Words" (Triconsonantal Roots) na nagpapahiwatig ng kongkreto at makapangyarihang larawan.');
      nuances.push('Tingnan ang covenantal terms tulad ng Hesed (tapat na pag-ibig), Berit (tipan), at Shalom (kabuuan/kapayapaan).');
    } else {
      nuances.push('Nakasulat sa Koine Greek. Tiyakin ang aspekto ng pandiwa (Aorist tense para sa minsang ginawa, Present active para sa tuloy-tuloy na pagkilos).');
      nuances.push('Suriin ang mga preposisyon (tulad ng "en Christo" - kay Cristo, "dia pisteos" - sa pamamagitan ng pananampalataya).');
    }

    return {
      reference: `${book.tagalog} ${chapter}:${verse.v}`,
      genre: book.category,
      historicalContext: `Bahagi ng ${book.testament === 'OT' ? 'Lumang Tipan' : 'Bagong Tipan'}, sa aklat ng ${book.tagalog} (${book.name}).`,
      connectivesFound: connectives,
      syllogism,
      keyThemes: ['Soberanya ng Diyos', 'Katotohanan at Doktrina', 'Buhay Pananampalataya', 'Pangako ng Tipan'],
      originalNuances: nuances,
      hermeneuticalApplication: `Paano ito nauugnay kay Cristo at paano ito dapat mabuhay ngayon sa ating pang-araw-araw na pagpapasiya?`
    };
  }

  // Call Gemini API for Deep Exegesis & Theological Logic
  async generateAiExegesis(
    apiKey: string,
    book: BookMetadata,
    chapter: number,
    verse: Verse,
    promptMode: 'logic' | 'original' | 'compare' | 'apologetics' | 'homiletics',
    userCustomQuestion?: string,
    lang: 'tl' | 'en' = 'tl'
  ): Promise<string> {
    if (!apiKey) {
      throw new Error(lang === 'en' ? 'Missing Gemini API key. Please configure your API key in Settings.' : 'Walang Gemini API key. Pakilagay ang iyong API Key sa Settings.');
    }

    const ref = lang === 'en' ? `${book.name} ${chapter}:${verse.v}` : `${book.tagalog} (${book.name}) ${chapter}:${verse.v}`;
    const cleanKjv = verse.kjv.replace(/<S>\d+<\/S>/g, '').trim();

    let systemPrompt = '';
    let instruction = '';

    if (lang === 'en') {
      systemPrompt = `You are a scholarly Biblical Theologian, Exegete, and Professor of Logic and Hermeneutics.
Provide your response in clear, formal, exegetically precise English with intellectual humility, scriptural fidelity, and deductive rigor.

Passage Under Investigation:
- Reference: ${ref}
- King James Version: "${cleanKjv}"
- Tagalog (Ang Dating Biblia 1905): "${verse.adb}"
- Original Text (${book.testament === 'OT' ? 'Hebrew WLC' : 'Greek Textus Receptus'}): "${verse.orig}"
`;

      switch (promptMode) {
        case 'logic':
          instruction = `Conduct a STRICT LOGICAL & SYLLOGISTIC ANALYSIS:
1. Define the Major Premise, Minor Premise, and Logical Conclusion of this argument.
2. Analyze the logical connectives and discourse flow (causation, inference, contrast, conditions).
3. Identify potential logical fallacies or erroneous assumptions often read into this verse.
4. Explain how this proposition flows logically into adjacent verses.`;
          break;
        case 'original':
          instruction = `Conduct an ORIGINAL LANGUAGE EXEGESIS (${book.testament === 'OT' ? 'Biblical Hebrew' : 'Koine Greek'}):
1. Break down key terms, Strong's concordance numbers, and root derivations.
2. Explain grammatical nuances (verbal aspects, voice, cases) not evident in translations.
3. Elucidate historical-cultural context of these terms when written.`;
          break;
        case 'compare':
          instruction = `Comparative Translation Analysis:
1. Strengths and lexical features of the King James Version vs. Ang Dating Biblia (1905).
2. Which translation aligns most precisely with the original Greek/Hebrew syntax here?`;
          break;
        case 'apologetics':
          instruction = `Apologetic & Hermeneutical Difficulty Resolution:
1. What common objections, apparent contradictions, or skeptical challenges are raised against this text?
2. Resolve them using systematic theology and the Analogy of Scripture.`;
          break;
        case 'homiletics':
          instruction = `Expository Teaching & Bible Study Outline:
1. Clear theological title.
2. Central Proposition (Big Idea).
3. 3-Point deductive outline with exposition, illustration, and application.`;
          break;
      }

      if (userCustomQuestion) {
        instruction += `\n\nSpecific inquiry from user: "${userCustomQuestion}"`;
      }
    } else {
      systemPrompt = `Ikaw ay isang dalubhasang Biblical Theologian, Exegete, at Propesor ng Lohika at Hermenyutika. 
Sumagot ka sa Tagalog (o pinaghalong Tagalog-English para sa teknikal na terminolohiya) nang may mataas na antas ng talino, kababaang-loob, katapatan sa Kasulatan, at mahigpit na lohika.

Ang pinag-aaralang talata:
- Reference: ${ref}
- Salin sa Tagalog (Ang Dating Biblia 1905): "${verse.adb}"
- Salin sa English (King James Version): "${cleanKjv}"
- Orihinal na Teksto (${book.testament === 'OT' ? 'Hebrew WLC' : 'Greek Textus Receptus'}): "${verse.orig}"
`;

      switch (promptMode) {
        case 'logic':
          instruction = `Magsagawa ng STRICT LOGICAL ANALYSIS:
1. Tukuyin ang Major Premise, Minor Premise, at Conclusion ng argumentong ito.
2. Suriin ang mga Logical Connectives (sapagkat, samakatuwid, ngunit, kung).
3. Mayroon bang potential logical fallacies o maling akala sa talatang ito na madalas maging sanhi ng maling interpretasyon?
4. Paano dumadaloy ang lohika mula sa naunang mga talata patungo sa susunod?`;
          break;
        case 'original':
          instruction = `Magsagawa ng ORIGINAL LANGUAGE EXEGESIS (${book.testament === 'OT' ? 'Hebrew' : 'Greek'}):
1. Himayin ang mga mahahalagang salita, Strong's numbers, at root words.
2. Ipaliwanag ang grammatical nuances (tenses, moods, voice) na hindi agad nakikita sa salin.
3. Ano ang pangkulturang konteksto ng mga salitang ito noong panahon na isinulat?`;
          break;
        case 'compare':
          instruction = `Paghambingin ang mga salin:
1. Ano ang kalakasan at katangian ng Ang Dating Biblia (1905)?
2. Ano ang pagkakaiba nito sa King James Version?
3. Alin sa kanila ang mas malapit sa orihinal na diwa ng ${book.testament === 'OT' ? 'Hebreo' : 'Griyego'} sa talatang ito?`;
          break;
        case 'apologetics':
          instruction = `Magsagawa ng APOLOGETICS & DIFFICULTY RESOLUTION:
1. Ano ang mga karaniwang pagtutol, dilemma, o tila kontradiksyon na ibinabato sa talatang ito?
2. Paano ito mareresolba gamit ang sistematikong teolohiya at Analogy of Scripture (kasulatan nagpapaliwanag sa kasulatan)?
3. Ano ang matibay na depensa sa katotohanang ito?`;
          break;
        case 'homiletics':
          instruction = `Gumawa ng SERMON & BIBLE STUDY OUTLINE:
1. Pamagat ng Mensahe (Theological & Captivating Title).
2. Pangunahing Punto (Big Idea / Thesis Statement).
3. 3-Point Outline na may Lohikal na Pag-unlad (Explanation, Illustration, Application).
4. Kongkretong Hamon sa Puso at Pagkilos.`;
          break;
      }

      if (userCustomQuestion) {
        instruction += `\n\nDagdag na tanong mula sa mag-aaral: "${userCustomQuestion}"`;
      }
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${instruction}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };

    // Use Gemini 2.5 Flash / Pro model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gemini API error: ${resp.status}`);
    }

    const data = await resp.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || (lang === 'en' ? 'No response received from AI.' : 'Walang nabuong tugon mula sa AI.');
  }
}

export const logicAnalyzerService = new LogicAnalyzerService();
