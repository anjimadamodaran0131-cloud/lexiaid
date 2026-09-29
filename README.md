# 🧠 LexiAid - AI-Powered Reading Assistant for Dyslexia

LexiAid is a web application designed to help students with dyslexia read and understand text more easily using AI-powered tools.

---

## ✨ Features

- 📄 **Text Converter** – Convert any text or PDF into dyslexia-friendly format with custom fonts, font size, line spacing, letter spacing and background color
- 🤖 **AI Summary** – Automatically summarizes text into up to 7 key points using BART AI model
- 🔍 **Keyword Highlighting** – Automatically detects and highlights important keywords in the text
- 🔊 **Read Aloud** – Reads the converted text aloud with sentence-by-sentence highlighting
- 📊 **Reading Assessment** – Records your reading and gives scores for fluency, accuracy and speed
- 🎤 **Speech to Text** – Convert your speech into text in real time
- 🔈 **Text to Speech** – Convert any text to speech with custom voice and speed
- 📥 **PDF Download** – Download the converted text as a formatted PDF
- 🏆 **Gamification** – Earn points and level up as you use the app
- ⚙️ **Settings** – Customize font, size and background color across the entire app
- 🔐 **Authentication** – Secure login, signup and password reset via email

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Backend | Django (Python) |
| Database | PostgreSQL |
| AI Model | BART (facebook/bart-large-cnn) |
| PDF Extraction | pdfplumber + Tesseract OCR |
| Frontend | HTML, CSS, JavaScript |
| Text to Speech | Web Speech API |
| PDF Generation | jsPDF + html2canvas |
| Email | Gmail SMTP |
| Fonts | OpenDyslexic, Sylexiad |

---

## 🚀 Setup Instructions

### Prerequisites
- Python 3.10+
- PostgreSQL
- Tesseract OCR
- Git

### 1. Clone the repository
```bash
git clone https://github.com/abhijithshaju/lexiaid.git
cd lexiaid
```

### 2. Create virtual environment
```bash
python -m venv virtualenv
virtualenv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create `.env` file in root folder
```
SECRET_KEY=your_django_secret_key
DB_NAME=lexiaid_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
```

### 5. Setup PostgreSQL
- Install PostgreSQL
- Create a database called `lexiaid_db`

### 6. Run migrations
```bash
python manage.py migrate
```

### 7. Create superuser
```bash
python manage.py createsuperuser
```

### 8. Run the server
```bash
python manage.py runserver
```

### 9. Open in browser
```
http://127.0.0.1:8000
```

---

## 📱 Usage

1. **Sign up** for a free account
2. Go to **Text Converter**
3. **Type/paste text** or **upload a PDF**
4. Click **Convert Text**
5. View formatted text with **AI Summary** and **highlighted keywords**
6. Click **Read Aloud** to listen
7. Click **Reading Assessment** to test your reading
8. **Download PDF** to save the converted text

---

## 🎓 Project Info

- **Type:** Mini Project
- **Domain:** Assistive Technology / AI
- **Purpose:** Help students with dyslexia read and understand text better

---

## 👨‍💻 Developer

**Abhijith Shaju**
- GitHub: [@abhijithshaju](https://github.com/abhijithshaju)
- Email: abhjithkshaju26@gmail.com

---

## 📄 License

This project is for educational purposes only.