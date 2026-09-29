from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    points = models.IntegerField(default=0)

    def __str__(self):
        return self.user.username

    def get_level(self):
        return (self.points // 500) + 1

class PDFHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pdf_history')
    pdf_name = models.CharField(max_length=255)
    extracted_text = models.TextField()
    summary_points = models.JSONField(default=list)
    keywords = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.pdf_name}"


class ReadingAssessment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessments')
    fluency = models.IntegerField(default=0)
    accuracy = models.IntegerField(default=0)
    reading_speed = models.IntegerField(default=0)
    overall_score = models.IntegerField(default=0)
    feedback = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.overall_score}%"