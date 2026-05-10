<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            border: 2px solid #10b981;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
        }
        .code-box {
            background-color: #fff;
            border: 2px dashed #10b981;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            color: #10b981;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏝️ DiscoverMansalay</div>
            <h2 style="color: #333; margin: 0;">Email Verification</h2>
        </div>

        <p>Hello {{ $userName }},</p>

        <p>Thank you for registering with DiscoverMansalay! To complete your registration, please use the verification code below:</p>

        <div class="code-box">
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Your Verification Code</div>
            <div class="code">{{ $code }}</div>
        </div>

        <div class="warning">
            ⚠️ <strong>Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
        </div>

        <p>If you didn't request this code, please ignore this email.</p>

        <p>Welcome to DiscoverMansalay - Start exploring the beauty of Mansalay, Oriental Mindoro!</p>

        <div class="footer">
            <p>© 2026 DiscoverMansalay. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
