from django.urls import path
from core import views

urlpatterns = [
    # Auth
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('forgot-password/', views.forgot_password_view, name='forgot_password'),

    # Pages
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('text-converter/', views.text_converter_view, name='text_converter'),
    path('text-to-speech/', views.text_to_speech_view, name='text_to_speech'),
    path('speech-to-text/', views.speech_to_text_view, name='speech_to_text'),
    path('settings/', views.settings_view, name='settings'),
    path('leaderboard/', views.leaderboard_view, name='leaderboard'),
    path('admin-panel/', views.admin_panel_view, name='admin_panel'),
    path('admin-panel/user/<int:user_id>/', views.admin_user_detail_view, name='admin_user_detail'),

    # API
    path('api/add-points/', views.add_points_api, name='add_points'),
    path('api/simplify/', views.simplify_text_api, name='simplify_text'),
    path('api/user/', views.get_user_api, name='get_user'),
    path('api/upload-pdf/', views.upload_pdf_api, name='upload_pdf'),
    path('api/save-assessment/', views.save_assessment_api, name='save_assessment'),
]