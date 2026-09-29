import pdfplumber
import pytesseract
import cv2
import numpy as np
from PIL import Image
import re

# Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.models import Profile
from .models import Profile, PDFHistory, ReadingAssessment
import json


from transformers import BartForConditionalGeneration, BartTokenizer
import threading
import re

bart_model = None
bart_tokenizer = None

def load_bart():
    global bart_model, bart_tokenizer
    print("⏳ Loading BART model...")
    bart_tokenizer = BartTokenizer.from_pretrained("facebook/bart-large-cnn")
    bart_model = BartForConditionalGeneration.from_pretrained("facebook/bart-large-cnn")
    print("✅ BART ready!")

threading.Thread(target=load_bart, daemon=True).start()


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        try:
            username = User.objects.get(email=email).username
            user = authenticate(request, username=username, password=password)
            if user:
                login(request, user)
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'error': 'Invalid email or password'})
        except User.DoesNotExist:
            return JsonResponse({'error': 'Invalid email or password'})
    return render(request, 'core/login.html')


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already registered'})
        username = email.split('@')[0]
        base = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = base + str(counter)
            counter += 1
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=name
        )
        Profile.objects.create(user=user)
        login(request, user)
        return JsonResponse({'success': True})
    return render(request, 'core/signup.html')


def logout_view(request):
    logout(request)
    return redirect('login')


def forgot_password_view(request):
    from django.shortcuts import redirect
    return redirect('password_reset')



import random

TIPS = [
    "Try reading with the cream background — it reduces eye strain!",
    "Use the OpenDyslexic font for better letter recognition.",
    "Reading aloud helps strengthen comprehension and fluency!",
    "Take breaks every 20 minutes to keep your focus sharp.",
]

@login_required
def dashboard_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    progress = int(((profile.points % 500) / 500) * 100)
    return render(request, 'core/dashboard.html', {
        'user': request.user,
        'profile': profile,
        'progress': progress,
        'points_in_level': profile.points % 500,
        'tip': random.choice(TIPS),
    })


@login_required
def text_converter_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return render(request, 'core/text_converter.html', {
        'user': request.user,
        'profile': profile,
    })


@login_required
def text_to_speech_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return render(request, 'core/text_to_speech.html', {
        'user': request.user,
        'profile': profile,
    })


@login_required
def speech_to_text_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return render(request, 'core/speech_to_text.html', {
        'user': request.user,
        'profile': profile,
    })


@login_required
def settings_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return render(request, 'core/settings.html', {
        'user': request.user,
        'profile': profile,
    })


@login_required
def leaderboard_view(request):
    profiles = Profile.objects.select_related('user').order_by('-points')[:50]
    return render(request, 'core/leaderboard.html', {
        'profiles': profiles,
    })


@csrf_exempt
@login_required
def add_points_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        amount = data.get('amount', 5)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.points += amount
        profile.save()
        return JsonResponse({
            'success': True,
            'points': profile.points,
            'level': profile.get_level(),
        })
    return JsonResponse({'error': 'Invalid request'})

# ── PDF Extraction Functions ──────────────────────────

def extract_raw_text(pdf_file):
    text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(layout=True)
            if page_text:
                text += page_text + "\n"
    return text.strip()


def detect_header_footer_lines(pdf_file):
    header_lines = {}
    footer_lines = {}
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            height = page.height
            text = page.extract_text(layout=True)
            if not text:
                continue
            lines = text.splitlines()
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                words = page.extract_words()
                for w in words:
                    if w['text'] in stripped:
                        top = w['top']
                        bottom = w['bottom']
                        if top < height * 0.15:
                            header_lines[stripped] = header_lines.get(stripped, 0) + 1
                        elif bottom > height * 0.9:
                            footer_lines[stripped] = footer_lines.get(stripped, 0) + 1
                        break
    headers = {k for k, v in header_lines.items() if v > 1}
    footers = {k for k, v in footer_lines.items() if v > 1}
    return headers, footers


def remove_detected_noise(text, headers, footers):
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped in headers:
            continue
        if stripped in footers:
            continue
        cleaned.append(stripped)
    return "\n".join(cleaned)


def remove_standalone_page_numbers(text):
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if stripped.isdigit() and len(stripped) <= 3:
            continue
        cleaned.append(line)
    return "\n".join(cleaned)


def clean_text_preserve_lines(text):
    lines = text.splitlines()
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        line = re.sub(r'[ \t]+', ' ', line)
        if line:
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def should_use_ocr(text):
    if not text or len(text.strip()) == 0:
        return True
    if len(text) < 100:
        return True
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
    if len(words) < 20:
        return True
    return False


def preprocess_for_ocr(image):
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    return blur


def ocr_pdf(pdf_file):
    ocr_text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            image = page.to_image(resolution=300).original
            processed = preprocess_for_ocr(image)
            text = pytesseract.image_to_string(
                processed,
                lang="eng",
                config="--oem 3 --psm 6"
            )
            ocr_text += text + "\n"
    return ocr_text.strip()


def process_pdf(pdf_file):
    raw_text = extract_raw_text(pdf_file)
    if should_use_ocr(raw_text):
        final_text = ocr_pdf(pdf_file)
        final_text = clean_text_preserve_lines(final_text)
    else:
        headers, footers = detect_header_footer_lines(pdf_file)
        filtered_text = remove_detected_noise(raw_text, headers, footers)
        filtered_text = remove_standalone_page_numbers(filtered_text)
        final_text = clean_text_preserve_lines(filtered_text)
    return final_text



def summarize_to_points(text):
    if not text or len(text.strip()) < 50:
        return []

    try:
        # Clean text - remove extra whitespace
        clean = ' '.join(text.split())

        # Split into chunks of 800 words (BART limit)
        words = clean.split()
        chunks = []
        chunk_size = 800

        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            if len(chunk.split()) > 30:
                chunks.append(chunk)

        all_summaries = []

        for chunk in chunks:
            inputs = bart_tokenizer.encode(
                chunk,
                return_tensors='pt',
                max_length=1024,
                truncation=True
            )
            summary_ids = bart_model.generate(
                inputs,
                max_length=200,
                min_length=50,
                num_beams=4,
                length_penalty=2.0,
                early_stopping=True,
            )
            summary = bart_tokenizer.decode(
                summary_ids[0],
                skip_special_tokens=True
            )
            all_summaries.append(summary)

        # Combine all chunk summaries
        combined = ' '.join(all_summaries)

        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', combined)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        # Limit to max 7 points
        points = sentences[:7]

        return points

    except Exception as e:
        print(f"BART error: {e}")
        return []


def extract_keywords(text):
    import re
    
    # Extended stop words including pronouns and common words
    stop_words = set([
        'the','a','an','and','or','but','in','on','at','to','for',
        'of','with','by','from','is','are','was','were','be','been',
        'have','has','had','do','does','did','will','would','could',
        'should','may','might','this','that','these','those','it',
        'its','as','if','then','than','so','yet','both','either',
        'each','few','more','most','other','some','such','no','not',
        'only','same','also','just','because','while','although',
        'when','where','which','who','whom','whose','what','how',
        # Pronouns
        'they','their','them','theirs','themselves',
        'they','we','our','ours','ourselves',
        'you','your','yours','yourself',
        'he','his','him','himself',
        'she','her','hers','herself',
        'i','my','me','mine','myself',
        'it','its','itself',
        # Common verbs
        'said','says','say','get','got','gets','make','made','makes',
        'know','known','knows','think','thought','thinks',
        'come','came','comes','take','took','takes','use','used','uses',
        'can','about','like','time','very','when','much','well',
        'also','back','after','first','last','long','little','own',
        'right','old','big','high','low','next','early','young',
        'important','large','able','between','need','never','new',
        # Common adjectives/adverbs
        'many','every','never','always','often','never','still',
        'here','there','now','then','always','around','per',
        'however','therefore','thus','hence','since','through',
        'into','onto','upon','about','above','below','under','over',
        'between','among','within','without','during','before','after',
        # Numbers as words
        'one','two','three','four','five','six','seven','eight',
        'nine','ten','hundred','thousand','million',
    ])
    
    # Get all words with 4+ characters
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text)
    
    freq = {}
    for word in words:
        lower = word.lower()
        if lower not in stop_words:
            freq[lower] = freq.get(lower, 0) + 1
    
    # Prefer longer words (more likely to be technical/important)
    # Score = frequency × word_length_bonus
    scored = {}
    for word, count in freq.items():
        length_bonus = 1.5 if len(word) >= 7 else 1.0
        scored[word] = count * length_bonus
    
    sorted_words = sorted(scored.items(), key=lambda x: x[1], reverse=True)
    keywords = [word for word, score in sorted_words[:10]]
    
    return keywords


@csrf_exempt
@login_required
def get_user_api(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return JsonResponse({
        'name': request.user.first_name or request.user.username,
        'email': request.user.email,
        'points': profile.points,
        'level': profile.get_level(),
    })


@csrf_exempt
@login_required
def upload_pdf_api(request):
    if request.method == 'POST':
        pdf_file = request.FILES.get('pdf')
        if not pdf_file:
            return JsonResponse({'error': 'No PDF uploaded'})
        try:
            text = process_pdf(pdf_file)
            if not text:
                return JsonResponse({'error': 'Could not extract text'})

            # Save to database
            PDFHistory.objects.create(
                user=request.user,
                pdf_name=pdf_file.name,
                extracted_text=text,
            )

            return JsonResponse({'text': text})
        except Exception as e:
            return JsonResponse({'error': str(e)})
    return JsonResponse({'error': 'Invalid request'})


@csrf_exempt
@login_required
def simplify_text_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        text = data.get('text', '').strip()

        if not text:
            return JsonResponse({'error': 'No text provided'})

        summary_points = []
        if bart_model is not None and bart_tokenizer is not None:
            summary_points = summarize_to_points(text)

        keywords = extract_keywords(text)

        # Update latest PDF history with summary and keywords
        try:
            latest_pdf = PDFHistory.objects.filter(user=request.user).first()
            if latest_pdf:
                latest_pdf.summary_points = summary_points
                latest_pdf.keywords = keywords
                latest_pdf.save()
        except:
            pass

        return JsonResponse({
            'simplified': text,
            'summary_points': summary_points,
            'keywords': keywords,
            'model_ready': bart_model is not None
        })

    return JsonResponse({'error': 'Invalid request'})


@csrf_exempt
@login_required
def save_assessment_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        # Save new assessment
        ReadingAssessment.objects.create(
            user=request.user,
            fluency=data.get('fluency', 0),
            accuracy=data.get('accuracy', 0),
            reading_speed=data.get('speed', 0),
            overall_score=data.get('overall', 0),
            feedback=data.get('feedback', ''),
        )

        # Keep only last 3 assessments per user
        assessments = ReadingAssessment.objects.filter(user=request.user)
        if assessments.count() > 3:
            # Delete oldest ones beyond 3
            oldest_ids = assessments.values_list('id', flat=True)[3:]
            ReadingAssessment.objects.filter(id__in=list(oldest_ids)).delete()

        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request'})


@login_required
def admin_panel_view(request):
    # Only superuser can access
    if not request.user.is_superuser:
        return redirect('dashboard')
    
    from django.contrib.auth.models import User
    
    users = User.objects.all().order_by('-date_joined')
    pdf_history = PDFHistory.objects.all().order_by('-created_at')[:20]
    assessments = ReadingAssessment.objects.all().order_by('-created_at')[:20]
    
    context = {
        'users': users,
        'pdf_history': pdf_history,
        'assessments': assessments,
        'total_users': users.count(),
        'total_pdfs': PDFHistory.objects.count(),
        'total_assessments': ReadingAssessment.objects.count(),
    }
    return render(request, 'core/admin_panel.html', context)


@login_required
def admin_user_detail_view(request, user_id):
    if not request.user.is_superuser:
        return redirect('dashboard')
    
    from django.contrib.auth.models import User
    from django.shortcuts import get_object_or_404
    
    selected_user = get_object_or_404(User, id=user_id)
    pdf_history = PDFHistory.objects.filter(user=selected_user).order_by('-created_at')
    assessments = ReadingAssessment.objects.filter(user=selected_user).order_by('-created_at')
    
    context = {
        'selected_user': selected_user,
        'pdf_history': pdf_history,
        'assessments': assessments,
    }
    return render(request, 'core/admin_user_detail.html', context)


    from django.conf import settings as django_settings