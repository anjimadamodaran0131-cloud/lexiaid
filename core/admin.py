from django.contrib import admin
from .models import Profile, PDFHistory, ReadingAssessment

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'points', 'get_level']

@admin.register(PDFHistory)
class PDFHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'pdf_name', 'created_at']
    list_filter = ['user']
    readonly_fields = ['extracted_text', 'summary_points', 'keywords', 'created_at']

@admin.register(ReadingAssessment)
class ReadingAssessmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'fluency', 'accuracy', 'reading_speed', 'overall_score', 'created_at']
    list_filter = ['user']
    readonly_fields = ['created_at']