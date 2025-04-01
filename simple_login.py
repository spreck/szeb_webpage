from flask import Flask, session, redirect, url_for, render_template_string

app = Flask(__name__)
app.secret_key = 'temporary_fix_key'

# Simple login page without CSRF
@app.route('/')
def index():
    html = '''
    <html>
    <head>
        <title>Simple Login</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
            .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
            button { background-color: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Quick Login Fix</h1>
            <p>Click below to bypass regular login and access the admin page directly:</p>
            <a href="/login_now"><button>Login Now</button></a>
        </div>
    </body>
    </html>
    '''
    return render_template_string(html)

# Direct login route
@app.route('/login_now')
def login_now():
    session['admin_logged_in'] = True
    return redirect('/admin')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001)
