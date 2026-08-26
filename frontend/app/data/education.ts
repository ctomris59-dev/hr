// web_arayuz/app/data/educationData.ts

export interface EducationContent {
    title: string;
    books: string[];
    courses: string[];
  }
  
  export interface EducationLevels {
    [key: string]: EducationContent; // "Level 1", "Level 2", "Level 3"
  }
  
  export const TIERED_EDUCATION_DB: Record<string, EducationLevels> = {
    "DIG": {
      "Level 1": {
        "title": "Temel Dijital Yetkinlikler",
        "books": [
          "Dijital Minimalizm (Cal Newport)",
          "Siber Güvenlik 101 (başlangıç düzeyi)",
          "The Digital Transformation Playbook (David L. Rogers)",
          "The Shallows: What the Internet Is Doing to Our Brains (Nicholas Carr)",
          "The Digital Mindset (Paul Leonardi, Tsedal Neeley)",
          "Data Literacy: A User’s Guide (Julia Bauder)"
        ],
        "courses": [
          "Google Dijital Atölye: Temeller",
          "BTK Akademi: Dijital Okuryazarlık",
          "Microsoft Learn: Microsoft 365 / Office Temelleri",
          "Coursera: Introduction to Digital Transformation",
          "Elements of AI (University of Helsinki) [Ücretsiz]",
          "edX: Data Literacy Foundations (RIT) [Audit/ücretsiz izleme opsiyonu]"
        ]
      },
      "Level 2": {
        "title": "Dijital Dönüşüm ve Uygulama",
        "books": [
          "Competing in the Age of AI (Marco Iansiti, Karim R. Lakhani)",
          "Digital Business Transformation (Ranjay Gulati)",
          "Measure What Matters (John Doerr) [dijital hedef/OKR bağlantısı]",
          "The Lean Startup (Eric Ries)",
          "Human + Machine (Paul R. Daugherty, H. James Wilson)"
        ],
        "courses": [
          "Coursera: Digital Transformation (University of Virginia)",
          "Coursera: Fundamentals of Digital Transformation (Dartmouth)",
          "Google Data Analytics (Coursera) / Temel Veri Okuryazarlığı",
          "Udemy: Power BI ile Veri Görselleştirme",
          "Coursera: Google Cloud Digital Transformation (Google Cloud)",
          "Coursera: AI for Everyone (Andrew Ng) [erişilebilir]"
        ]
      },
      "Level 3": {
        "title": "Dijital Liderlik ve Vizyon",
        "books": [
          "Life 3.0 (Max Tegmark)",
          "The Fourth Industrial Revolution (Klaus Schwab)",
          "AI Superpowers (Kai-Fu Lee)",
          "The Age of AI (Henry Kissinger, Eric Schmidt, Daniel Huttenlocher)",
          "No Rules Rules (Reed Hastings, Erin Meyer) [dijital kültür/yeniden icat]"
        ],
        "courses": [
          "edX: HarvardX Leadership and Communication (program/seri)",
          "edX: HarvardX Exercising Leadership: Foundational Principles",
          "Coursera: Digital Transformation with Google Cloud",
          "edX ExecEd: Critical Thinking, Problem Solving & Decision-Making in a Complex World (Economist Education)",
          "University of Helsinki: Ethics of AI [Ücretsiz]",
          "MIT xPRO / edX: AI for Business Strategy (program/seri)"
        ]
      }
    },
    "LID": {
      "Level 1": {
        "title": "Kendine Liderlik & Temeller",
        "books": [
          "Her Şey Seninle Başlar (Mümin Sekman)",
          "Liderlik Dili",
          "Etkili İnsanların 7 Alışkanlığı (Stephen Covey)",
          "Dare to Lead (Brené Brown)"
        ],
        "courses": [
          "LinkedIn: Liderliğe İlk Adım",
          "Ekip Yönetimi 101",
          "Kişisel Liderlik ve Farkındalık",
          "Coursera: Improving Leadership & Governance (genel)",
          "edX: Leadership and Emotional Intelligence (program/seri) [erişilebilir]"
        ]
      },
      "Level 2": {
        "title": "Ekip Liderliği & Koçluk",
        "books": [
          "Liderin El Kitabı (John Maxwell)",
          "Koçluk için Liderlik",
          "Beş Dysfunctions of a Team (Patrick Lencioni)",
          "Leaders Eat Last (Simon Sinek)"
        ],
        "courses": [
          "Situational Leadership II",
          "Etkili Geri Bildirim Verme",
          "Çatışma Yönetimi ve Takım Liderliği",
          "LinkedIn Learning: Coaching Skills for Leaders",
          "Coursera: Leading People and Teams (Specialization) [erişilebilir]"
        ]
      },
      "Level 3": {
        "title": "Stratejik Liderlik & Vizyon",
        "books": [
          "Simyacı (Metaforik Liderlik)",
          "Good to Great (İyiden Mükemmele)",
          "Liderlikte Ustalık",
          "No Rules Rules (Reed Hastings, Erin Meyer)",
          "The Fearless Organization (Amy C. Edmondson) [psikolojik güvenlik]"
        ],
        "courses": [
          "Harvard ManageMentor: Strategic Leadership",
          "Executive Leadership Program",
          "Değişim Yönetimi Liderliği",
          "edX: Leading in a Remote/Hybrid Work Environment (program/seri)",
          "Coursera: Strategic Leadership and Management (program/seri)"
        ]
      }
    },
    "ANA": {
      "Level 1": {
        "title": "Analitik Düşünceye Giriş",
        "books": [
          "How to Think Like a Statistician (Roger D. Peng)",
          "Thinking, Fast and Slow (Daniel Kahneman)",
          "The Art of Thinking Clearly (Rolf Dobelli)",
          "Naked Statistics (Charles Wheelan)",
          "The Art of Statistics (David Spiegelhalter)"
        ],
        "courses": [
          "edX: Problem Solving and Critical Thinking Skills (FullbridgeX)",
          "edX: Critical Thinking & Problem Solving (RITx)",
          "Khan Academy: İstatistik & Olasılık (temel)",
          "Udemy: Excel ile Veri Analizine Giriş",
          "edX: Data Literacy Foundations (RIT) [Audit/ücretsiz izleme opsiyonu]"
        ]
      },
      "Level 2": {
        "title": "Veri Analizi ve Problem Çözme",
        "books": [
          "Factfulness (Hans Rosling)",
          "The Signal and the Noise (Nate Silver)",
          "Nudge (Richard H. Thaler, Cass R. Sunstein)",
          "Bulletproof Problem Solving (Charles Conn, Robert McLean)",
          "Calling Bullshit (Carl T. Bergstrom, Jevin D. West)"
        ],
        "courses": [
          "Coursera: Data-Driven Decision Making (genel)",
          "Udemy: SQL Temelleri",
          "Coursera: Business Analytics (temel/orta seviye)",
          "edX: Problem-Solving (koleksiyon / yol)",
          "Coursera: Google Data Analytics Professional Certificate [erişilebilir]"
        ]
      },
      "Level 3": {
        "title": "Stratejik Analiz ve Karar Bilimi",
        "books": [
          "Superforecasting (Philip E. Tetlock, Dan Gardner)",
          "The Black Swan (Nassim Nicholas Taleb)",
          "Algorithms to Live By (Brian Christian, Tom Griffiths)",
          "Thinking in Bets (Annie Duke)",
          "Noise (Daniel Kahneman, Olivier Sibony, Cass R. Sunstein)"
        ],
        "courses": [
          "edX ExecEd: Critical Thinking, Problem Solving & Decision-Making in a Complex World (Economist Education)",
          "Coursera: Decision-Making and Scenarios (genel/ileri)",
          "Coursera: Advanced Business Analytics (ileri)",
          "MITx / edX: Data Science (ileri seviye modüller)",
          "Coursera: Data Science (Johns Hopkins / benzeri) (ileri) [erişilebilir]"
        ]
      }
    },
    "COM": {
      "Level 1": {
        "title": "Etkili İletişim Temelleri",
        "books": [
          "How to Win Friends and Influence People (Dale Carnegie)",
          "Nonviolent Communication (Marshall B. Rosenberg)",
          "Crucial Conversations (Patterson, Grenny, McMillan, Switzler)",
          "Talk Like TED (Carmine Gallo)",
          "You’re Not Listening (Kate Murphy)"
        ],
        "courses": [
          "LinkedIn Learning: Communication Foundations",
          "BTK Akademi: Etkili İletişim Stratejileri",
          "Udemy: Beden Dili Eğitimi",
          "Alison: Effective Communication Skills",
          "Coursera: Improving Communication Skills (University of Pennsylvania) [erişilebilir]"
        ]
      },
      "Level 2": {
        "title": "İkna ve Müzakere",
        "books": [
          "Getting to Yes (Roger Fisher, William Ury)",
          "Never Split the Difference (Chris Voss)",
          "Influence (Robert Cialdini)",
          "Difficult Conversations (Douglas Stone, Bruce Patton, Sheila Heen)",
          "The Culture Map (Erin Meyer) [kültürlerarası iletişim]"
        ],
        "courses": [
          "Coursera: Successful Negotiation: Essential Strategies and Skills",
          "Coursera: High Performance Collaboration: Leadership, Teamwork, and Negotiation",
          "LinkedIn Learning: Negotiation Foundations",
          "Udemy: İkna ve Müzakere Teknikleri",
          "LinkedIn Learning: Communicating with Confidence"
        ]
      },
      "Level 3": {
        "title": "Hikâye Anlatıcılığı ve Etki",
        "books": [
          "Made to Stick (Chip Heath, Dan Heath)",
          "Storytelling with Data (Cole Nussbaumer Knaflic)",
          "The Art of Public Speaking (Dale Carnegie)",
          "Leadership Communication (storytelling odaklı)",
          "Digital Body Language (Erica Dhawan)"
        ],
        "courses": [
          "Coursera: Leadership Communication for Maximum Impact (Storytelling)",
          "Coursera: Public Speaking / Presentation Skills (ileri)",
          "Toastmasters Pathways (program)",
          "MasterClass: Public Speaking (çeşitli eğitmenler)",
          "LinkedIn Learning: Storytelling for Influence"
        ]
      }
    },
    "STR": {
      "Level 1": {
        "title": "Stratejik Düşünme Temelleri",
        "books": [
          "The Goal (Eliyahu M. Goldratt)",
          "The Personal MBA (Josh Kaufman)",
          "Good Strategy / Bad Strategy (Richard Rumelt)",
          "Playing to Win (A.G. Lafley, Roger L. Martin)",
          "Your Strategy Needs a Strategy (Martin Reeves, Knut Haanaes, Janmejaya Sinha)"
        ],
        "courses": [
          "Udemy: Stratejik Yönetim (temel)",
          "Coursera: Introduction to Business Strategy (temel)",
          "LinkedIn Learning: Strategic Thinking",
          "IIENSTITU: Stratejik Yönetim Eğitimi",
          "Coursera: Strategic Management (Copenhagen Business School / benzeri) [erişilebilir]"
        ]
      },
      "Level 2": {
        "title": "Stratejik Yönetim ve Rekabet",
        "books": [
          "Blue Ocean Strategy (W. Chan Kim, Renée Mauborgne)",
          "Competitive Strategy (Michael E. Porter)",
          "Good to Great (Jim Collins)",
          "The Art of War (Sun Tzu)",
          "Lead and Disrupt (Charles A. O’Reilly, Michael Tushman)"
        ],
        "courses": [
          "Coursera: Competitive Strategy",
          "Coursera: Strategic Planning and Execution",
          "Coursera: Digital Transformation (strateji bağlantılı)",
          "Udemy: SWOT / PESTLE / Rekabet Analizi",
          "edX: Agile Strategy Execution (program/seri)"
        ]
      },
      "Level 3": {
        "title": "Vizyoner Strateji ve Dönüşüm",
        "books": [
          "The Innovator’s Dilemma (Clayton M. Christensen)",
          "The Strategy Concept and Process (Mintzberg, Ahlstrand, Lampel)",
          "The Lean Enterprise (Jez Humble, Joanne Molesky, Barry O’Reilly)",
          "Thinking in Systems (Donella H. Meadows)",
          "Open Strategy (Christian Stadler, Kurt Matzler, Stephan Hautz)"
        ],
        "courses": [
          "Harvard Business / HBR: Strategy (program/seri)",
          "edX ExecEd: Complex Decision-Making (ileri)",
          "Coursera: Strategy Specialization (ileri)",
          "Senaryo Planlama Atölyesi (online/kurumsal)",
          "LinkedIn Learning: Scenario Planning",
          "Coursera: Business Strategy in a Digital World (program/seri)"
        ]
      }
    },
    "RES": {
      "Level 1": {
        "title": "Hedef Belirleme ve Önceliklendirme",
        "books": [
          "Getting Things Done (David Allen)",
          "Eat That Frog! (Brian Tracy)",
          "The One Thing (Gary Keller, Jay Papasan)",
          "Essentialism (Greg McKeown)"
        ],
        "courses": [
          "LinkedIn Learning: Time Management Fundamentals",
          "Udemy: Zaman Yönetimi ve Önceliklendirme",
          "Coursera: Work Smarter, Not Harder (temel verimlilik)",
          "Great Learning: Time Management for Productivity"
        ]
      },
      "Level 2": {
        "title": "Performans Takibi ve OKR",
        "books": [
          "Measure What Matters (John Doerr)",
          "The 4 Disciplines of Execution (McChesney, Covey, Huling)",
          "High Output Management (Andrew S. Grove)",
          "Deep Work (Cal Newport)",
          "The Effective Manager (Mark Horstman)"
        ],
        "courses": [
          "Coursera: OKR Certification: Leadership and Goal Setting",
          "Udemy: OKR ile Hedef ve Sonuç Yönetimi",
          "LinkedIn Learning: Measuring Performance with KPIs",
          "Coursera: Project Management (sonuç odaklı uygulama)",
          "Coursera: High Performance Collaboration (uygulama odaklı)"
        ]
      },
      "Level 3": {
        "title": "Yüksek Performans Kültürü",
        "books": [
          "Execution (Larry Bossidy, Ram Charan)",
          "The Effective Executive (Peter F. Drucker)",
          "Atomic Habits (James Clear)",
          "The Power of Habit (Charles Duhigg)",
          "High Performance Habits (Brendon Burchard)",
          "It’s the Manager (Jim Clifton, Jim Harter) [Gallup]"
        ],
        "courses": [
          "Harvard ManageMentor: Leading for Results (seri)",
          "Coursera: Leadership & Performance (ileri)",
          "MIT Sloan / ExecEd: High Performance Leadership (program)",
          "LinkedIn Learning: Building High-Performance Teams",
          "LinkedIn Learning: Building High-Performance Culture"
        ]
      }
    },
    "DET": {
      "Level 1": {
        "title": "Dikkat, Odak ve Kontrol Listeleri",
        "books": [
          "The Checklist Manifesto (Atul Gawande)",
          "Deep Work (Cal Newport)",
          "Focus (Daniel Goleman)",
          "Indistractable (Nir Eyal)",
          "Tiny Habits (BJ Fogg)"
        ],
        "courses": [
          "Udemy: Dikkat ve Odaklanma Teknikleri",
          "Coursera: Work Smarter (odak/alışkanlık modülleri)",
          "LinkedIn Learning: Attention to Detail",
          "OMÜ SEM: Dikkat ve Odaklanma Programı",
          "edX: Mindfulness and Well-being (odak/alışkanlık) [erişilebilir]"
        ]
      },
      "Level 2": {
        "title": "Kalite ve Hata Önleme",
        "books": [
          "The Toyota Way (Jeffrey K. Liker)",
          "Kaizen (Masaaki Imai)",
          "Quality Is Free (Philip B. Crosby)",
          "Lean Thinking (Womack, Jones)",
          "Principles: Life and Work (Ray Dalio) [sistematik çalışma]"
        ],
        "courses": [
          "Coursera: Six Sigma Yellow Belt (temel)",
          "Udemy: Lean / Kaizen Temelleri",
          "LinkedIn Learning: Lean Foundations",
          "ISO 9001 Kalite Yönetimi (online/kurumsal)",
          "edX: Quality Management Tools (program/seri)"
        ]
      },
      "Level 3": {
        "title": "Operasyonel Mükemmellik",
        "books": [
          "Out of the Crisis (W. Edwards Deming)",
          "The Goal (Eliyahu M. Goldratt)",
          "Black Box Thinking (Matthew Syed)",
          "The Lean Six Sigma Pocket Toolbook (George, Rowlands, Price, Maxey)"
        ],
        "courses": [
          "Coursera: Six Sigma Black Belt (ileri)",
          "MIT ExecEd: Operational Excellence (program)",
          "EFQM Mükemmellik Modeli Eğitimi (online/kurumsal)",
          "Advanced Process Improvement (online/kurumsal)",
          "edX: Process Improvement / Operational Excellence (program/seri)"
        ]
      }
    },
    "LRN": {
      "Level 1": {
        "title": "Öğrenmeyi Öğrenmek",
        "books": [
          "Mindset (Carol S. Dweck)",
          "How We Learn (Benedict Carey)",
          "Make It Stick (Brown, Roediger, McDaniel)",
          "A Mind for Numbers (Barbara Oakley)"
        ],
        "courses": [
          "Coursera: Learning How to Learn",
          "Coursera: Mindshift",
          "edX: Uncommon Sense Teaching (benzer seri/kapsam)",
          "Khan Academy: Learning Skills (temel)"
        ]
      },
      "Level 2": {
        "title": "Uzmanlaşma ve Öğrenme Çevikliği",
        "books": [
          "Ultralearning (Scott H. Young)",
          "Peak (Anders Ericsson, Robert Pool)",
          "Grit (Angela Duckworth)",
          "Range (David Epstein)",
          "The Adaptation Advantage (Heather McGowan, Chris Shipley)"
        ],
        "courses": [
          "Coursera: Learning to Learn (ileri öğrenme stratejileri)",
          "LinkedIn Learning: Learning Agility",
          "Udemy: Hızlı Okuma ve Hafıza Teknikleri",
          "edX: Learning Science (koleksiyon)",
          "Coursera: Uncommon Sense Teaching (Oakley) [erişilebilir]"
        ]
      },
      "Level 3": {
        "title": "Öğrenen Organizasyon ve Mentorluk",
        "books": [
          "The Fifth Discipline (Peter Senge)",
          "The Knowledge-Creating Company (Nonaka, Takeuchi)",
          "Think Again (Adam Grant)",
          "Mastery (Robert Greene)",
          "The Expertise Economy (Kelly Palmer, David Blake)"
        ],
        "courses": [
          "Coursera: Organizational Learning (ileri)",
          "ATD: Learning & Development (program)",
          "LinkedIn Learning: Mentoring Others",
          "Harvard ManageMentor: Coaching & Developing Employees"
        ]
      }
    },
    "ETH": {
      "Level 1": {
        "title": "İş Etiği Temelleri",
        "books": [
          "Business Ethics (Joseph W. Weiss)",
          "The Righteous Mind (Jonathan Haidt)",
          "Ethics (Simon Blackburn)",
          "Dürüstlük Hakkında (genel/başlangıç)",
          "Doing Good Better (William MacAskill)"
        ],
        "courses": [
          "edX: Ethics (koleksiyon / giriş)",
          "edX: Business Ethics (koleksiyon)",
          "LinkedIn Learning: Business Ethics",
          "Udemy: İş Etiği ve Kurumsal Davranış"
        ]
      },
      "Level 2": {
        "title": "Kurumsal Uyum ve Etik Karar Verme",
        "books": [
          "The Smartest Guys in the Room (Bethany McLean, Peter Elkind) [vaka]",
          "Misbehaving (Richard H. Thaler) [davranışsal etik bağlantısı]",
          "Giving and Taking / Give and Take (Adam Grant)",
          "Ethical Decision Making (iş dünyası odaklı)",
          "Technically Wrong (Sara Wachter-Boettcher) [teknoloji etiği]"
        ],
        "courses": [
          "edX: Ethics and Leadership (King’s College London)",
          "edX: Ethical Leadership in a Changing World (WellingtonX)",
          "Coursera: Business Ethics (üniversite dersleri)",
          "TEİD Akademi: Etik ve Uyum Programı (varsa kurum tercihiyle)",
          "Coursera: Corporate Compliance and Ethics (program/seri)"
        ]
      },
      "Level 3": {
        "title": "Etik Liderlik ve Yönetişim",
        "books": [
          "Principled Leadership (Stephen R. Covey / benzer)",
          "Conscious Capitalism (Mackey, Sisodia)",
          "The Culture Code (Daniel Coyle) [etik kültür bağlantısı]",
          "Corporate Governance (genel)"
        ],
        "courses": [
          "edX: Ethical Decision-Making for Global Managers (GeorgetownX) [program]",
          "edX: Entrepreneurship and Ethics (NYIF)",
          "Coursera: Corporate Governance (ileri)",
          "Harvard ManageMentor: Ethics at Work (seri)",
          "University of Helsinki: Ethics of AI [Ücretsiz]",
          "Coursera: AI Ethics (program/seri)"
        ]
      }
    },
    "DIS": {
      "Level 1": {
        "title": "Alışkanlık ve Disiplin Temelleri",
        "books": [
          "Atomic Habits (James Clear)",
          "The Power of Habit (Charles Duhigg)",
          "Willpower (Roy F. Baumeister, John Tierney)",
          "Eat That Frog! (Brian Tracy)",
          "High Performance Habits (Brendon Burchard)"
        ],
        "courses": [
          "Udemy: Öz Disiplin ve Alışkanlık Geliştirme",
          "Coursera: The Science of Well-Being (alışkanlık/refah)",
          "LinkedIn Learning: Building Self-Discipline",
          "Great Learning: Time Management for Productivity"
        ]
      },
      "Level 2": {
        "title": "Odak, Erteleme ve Üretkenlik",
        "books": [
          "Deep Work (Cal Newport)",
          "Indistractable (Nir Eyal)",
          "Essentialism (Greg McKeown)",
          "The Now Habit (Neil Fiore)",
          "Dopamine Detox (Thibaut Meurisse)"
        ],
        "courses": [
          "Coursera: Learning How to Learn (ertelemeyle başa çıkma bölümleri)",
          "Udemy: Prokrastinasyon (Erteleme) ile Mücadele",
          "LinkedIn Learning: Managing Your Time",
          "Mindfulness for Productivity (Coursera/edX)",
          "Udemy: Digital Minimalism / Odak Yönetimi (kurs)"
        ]
      },
      "Level 3": {
        "title": "Zor Hedeflerde Sürdürülebilir Disiplin",
        "books": [
          "Grit (Angela Duckworth)",
          "Peak (Anders Ericsson, Robert Pool)",
          "Extreme Ownership (Jocko Willink, Leif Babin)",
          "Mastery (Robert Greene)",
          "Can't Hurt Me (David Goggins)"
        ],
        "courses": [
          "Harvard ManageMentor: Resilience (seri)",
          "Coursera: High Performance (genel/ileri)",
          "LinkedIn Learning: Building Resilience",
          "Executive Productivity (program/kurumsal)"
        ]
      }
    },
    "TEA": {
      "Level 1": {
        "title": "Takım Oyunculuğu ve İşbirliği",
        "books": [
          "The Five Dysfunctions of a Team (Patrick Lencioni)",
          "The Culture Code (Daniel Coyle)",
          "Team of Teams (Stanley McChrystal)",
          "Crucial Conversations (Patterson, Grenny, McMillan, Switzler)",
          "The Culture Playbook (Daniel Coyle)"
        ],
        "courses": [
          "Coursera: Effective Collaboration & Teamwork Skills for Professionals",
          "OpenLearn: Groups and Teamwork",
          "LinkedIn Learning: Teamwork Foundations",
          "Alison: Working in Teams"
        ]
      },
      "Level 2": {
        "title": "Takım Dinamikleri ve İletişim",
        "books": [
          "Leaders Eat Last (Simon Sinek)",
          "Drive (Daniel H. Pink) [motivasyon]",
          "Radical Candor (Kim Scott) [geri bildirim]",
          "The Fearless Organization (Amy C. Edmondson) [psikolojik güvenlik]",
          "No Rules Rules (Reed Hastings, Erin Meyer) [kültür]"
        ],
        "courses": [
          "Coursera: High Performance Collaboration: Leadership, Teamwork, and Negotiation",
          "Coursera: Cultivate Teamwork and Collaboration",
          "LinkedIn Learning: Managing Team Conflict",
          "Udemy: Takım Dinamikleri ve Motivasyon",
          "FutureLearn: Collaborative Working in a Remote Team"
        ]
      },
      "Level 3": {
        "title": "Yüksek Performanslı Takımlar",
        "books": [
          "The Advantage (Patrick Lencioni)",
          "Good to Great (Jim Collins)",
          "High Output Management (Andrew S. Grove)",
          "Measure What Matters (John Doerr) [takım hizalama]"
        ],
        "courses": [
          "Coursera: Create a High-Performing Team (Google)",
          "Coursera: Managing High Performing Teams",
          "Harvard ManageMentor: Leading Teams (seri)",
          "Agile/Scrum Master (program/sertifika)",
          "edX: Psychological Safety at Work (program/seri)"
        ]
      }
    },
    "DEFAULT": {
      "Level 1": {
        "title": "Temel Yetkinlik Gelişimi",
        "books": [
          "Profesyonel Yaşama Giriş",
          "Kariyer Yönetimi",
          "İş Hayatında İletişim",
          "Kişisel Verimlilik"
        ],
        "courses": [
          "Kişisel Gelişim 101",
          "Ofis Programları",
          "Zaman Yönetimi Temelleri",
          "Temel Sunum Becerileri"
        ]
      },
      "Level 2": {
        "title": "Yetkinlik Derinleştirme",
        "books": [
          "Ustalık (Mastery)",
          "Akış (Flow)",
          "Etkili Alışkanlıklar",
          "Problem Çözme Rehberi"
        ],
        "courses": [
          "Proje Yönetimi",
          "İleri Excel",
          "Sunum ve İkna",
          "Performans Yönetimi"
        ]
      },
      "Level 3": {
        "title": "Ustalık ve Mentörlük",
        "books": [
          "Outliers (Çizginin Dışındakiler)",
          "Bilgelik Çağı",
          "Liderlikte Ustalık",
          "Öğrenen Organizasyon"
        ],
        "courses": [
          "Masterclass: Alanında Uzmanlık",
          "Mentorluk Eğitimi",
          "Stratejik Liderlik",
          "Yönetici Programı"
        ]
      }
    }
  };
  
  // --- EĞİTİM ÖNERİ FONKSİYONU ---
  export const getTieredRecommendation = (compCode: string, currentScore: number) => {
    // Veriyi güvenli bir şekilde çekelim, kod yoksa varsayılanı kullanalım
    const data = TIERED_EDUCATION_DB[compCode] || TIERED_EDUCATION_DB['DEFAULT'];
    
    let levelKey = 'Level 1';
    let color = "blue";
  
    if (currentScore < 3.0) {
      levelKey = 'Level 1';
      color = "red";
    } else if (currentScore < 4.0) {
      levelKey = 'Level 2';
      color = "orange";
    } else {
      levelKey = 'Level 3';
      color = "green";
    }
  
    // İlgili seviyenin verisini al
    const levelData = data[levelKey];
  
    // Sonuç objesini oluştur
    return {
      ...levelData,
      level_name: levelKey,
      color: color
    };
  };