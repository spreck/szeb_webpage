@echo off
echo ======================================================
echo FIXING AUTHENTICATION MODULE
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Adjust the routes to correctly render login template
echo Adjusting auth configuration...

:: Check if the login template exists
echo.
echo Checking login template location...
dir templates\login.html
dir templates\auth\login.html

:: If needed, copy login template to auth folder
echo.
echo Ensuring login template is in the correct location...
mkdir templates\auth 2>nul
copy templates\login.html templates\auth\login.html 2>nul

:: Create default login template if it doesn't exist
echo.
echo Creating default login template if missing...
echo ^<html^>
echo ^<head^>
echo     ^<title^>Login - Cone Scout^</title^>
echo     ^<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"^>
echo     ^<style^>
echo         body {
echo             padding-top: 5rem;
echo         }
echo         .form-signin {
echo             width: 100%%;
echo             max-width: 330px;
echo             padding: 15px;
echo             margin: auto;
echo         }
echo         .form-signin .form-control {
echo             position: relative;
echo             box-sizing: border-box;
echo             height: auto;
echo             padding: 10px;
echo             font-size: 16px;
echo         }
echo         .form-signin .form-control:focus {
echo             z-index: 2;
echo         }
echo         .form-signin input[type="email"] {
echo             margin-bottom: -1px;
echo             border-bottom-right-radius: 0;
echo             border-bottom-left-radius: 0;
echo         }
echo         .form-signin input[type="password"] {
echo             margin-bottom: 10px;
echo             border-top-left-radius: 0;
echo             border-top-right-radius: 0;
echo         }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<div class="container"^>
echo         ^<div class="form-signin"^>
echo             ^<h1 class="h3 mb-3 font-weight-normal"^>Sign In^</h1^>
echo             
echo             {% with messages = get_flashed_messages(with_categories=true) %}
echo               {% if messages %}
echo                 {% for category, message in messages %}
echo                   ^<div class="alert alert-{{ category }}"^>{{ message }}^</div^>
echo                 {% endfor %}
echo               {% endif %}
echo             {% endwith %}
echo             
echo             ^<form method="POST" action="{{ url_for('auth.login') }}"^>
echo                 {{ form.hidden_tag() }}
echo                 
echo                 ^<div class="form-group"^>
echo                     {{ form.email.label }}
echo                     {{ form.email(class="form-control", placeholder="Enter email") }}
echo                     {% if form.email.errors %}
echo                         ^<div class="invalid-feedback d-block"^>
echo                             {% for error in form.email.errors %}
echo                                 ^<span^>{{ error }}^</span^>
echo                             {% endfor %}
echo                         ^</div^>
echo                     {% endif %}
echo                 ^</div^>
echo                 
echo                 ^<div class="form-group"^>
echo                     {{ form.password.label }}
echo                     {{ form.password(class="form-control", placeholder="Password") }}
echo                     {% if form.password.errors %}
echo                         ^<div class="invalid-feedback d-block"^>
echo                             {% for error in form.password.errors %}
echo                                 ^<span^>{{ error }}^</span^>
echo                             {% endfor %}
echo                         ^</div^>
echo                     {% endif %}
echo                 ^</div^>
echo                 
echo                 ^<div class="form-check mb-3"^>
echo                     {{ form.remember(class="form-check-input") }}
echo                     {{ form.remember.label(class="form-check-label") }}
echo                 ^</div^>
echo                 
echo                 {{ form.submit(class="btn btn-lg btn-primary btn-block") }}
echo             ^</form^>
echo             
echo             ^<div class="mt-3"^>
echo                 ^<a href="{{ url_for('auth.register') }}" class="btn btn-outline-secondary"^>Register^</a^>
echo                 ^<a href="{{ url_for('auth.login_google') }}" class="btn btn-danger float-right"^>
echo                     ^<img src="https://img.icons8.com/color/16/000000/google-logo.png"^> Google Sign In
echo                 ^</a^>
echo             ^</div^>
echo             
echo             ^<p class="mt-3 text-center"^>
echo                 ^<a href="{{ url_for('index') }}"^>Return to Application^</a^>
echo             ^</p^>
echo         ^</div^>
echo     ^</div^>
echo ^</body^>
echo ^</html^>
> templates\auth\login.html

:: Restart the application
echo.
echo Restarting the application...
docker compose restart cone-app
timeout /t 5

echo.
echo ======================================================
echo Authentication module fixes applied
echo ======================================================
echo.
echo Please try accessing the login page again at:
echo https://conescout.duckdns.org/auth/login
echo.
pause
