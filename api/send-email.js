// File: api/send-email.js
import { Resend } from 'resend';

// Initialize Resend with your API key from environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Set CORS headers to allow requests from your domains
  const allowedOrigins = [
    'https://registration.nextpointperformance.com',
    'https://app.zite.io',
    'https://app.fillout.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://*.zite.app',
    'https://*.fillout.com'
  ];
  
  const origin = req.headers.origin;
  
  // Check if the origin is allowed
  if (origin && (allowedOrigins.includes(origin) || 
      allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace('*', '.*');
          return new RegExp(pattern).test(origin);
        }
        return false;
      }))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For testing, you can temporarily use * to allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coachName, tryoutGroup, recipientEmail, scores } = req.body;

    // Validate required fields
    if (!recipientEmail || !scores) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Function to get score background color
    const getScoreBackgroundColor = (score) => {
      if (score >= 4) return '#d4edda';
      if (score >= 3) return '#fff3cd';
      return '#f8d7da';
    };

    // Generate the score rows HTML
    const scoreRowsHtml = scores.map(score => {
      const playerNameWithEmojis = `${score.playerName}${score.love ? ' ❤️' : ''}${score.no ? ' 🚫' : ''}`;
      
      return `<tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${playerNameWithEmojis}</td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${score.tryoutNumber}</td>
        <td style="padding: 10px; text-align: center; background: ${getScoreBackgroundColor(score.passScore)}; border: 1px solid #ddd;">${score.passScore}</td>
        <td style="padding: 10px; text-align: center; background: ${getScoreBackgroundColor(score.setScore)}; border: 1px solid #ddd;">${score.setScore}</td>
        <td style="padding: 10px; text-align: center; background: ${getScoreBackgroundColor(score.hitScore)}; border: 1px solid #ddd;">${score.hitScore}</td>
        <td style="padding: 10px; text-align: center; background: ${getScoreBackgroundColor(score.serveScore)}; border: 1px solid #ddd;">${score.serveScore}</td>
        <td style="padding: 10px; text-align: center; background: ${getScoreBackgroundColor(score.overallScore)}; border: 1px solid #ddd; font-weight: bold;">${score.overallScore}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${score.notes || '-'}</td>
      </tr>`;
    }).join('');

    // Generate the full HTML email
    const emailHtml = `<!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #1a1a1a; padding: 30px; text-align: center;">
          <img src="https://res.cloudinary.com/deh4i8pla/image/upload/v1755287876/Logo-2-wht-ball_bxma9y.png" 
               alt="Next Point Performance" style="height: 60px;">
        </div>
        <div style="padding: 30px;">
          <h1>Tryout Evaluation Report</h1>
          <p><strong>Coach:</strong> ${coachName}</p>
          <p><strong>Group:</strong> ${tryoutGroup}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Player</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Tryout #</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Pass</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Set</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Hit</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Serve</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Overall</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${scoreRowsHtml}
            </tbody>
          </table>
        </div>
        <div style="padding: 20px; background: #f8f8f8; text-align: center; color: #666;">
          <p>Questions? Contact us at info@nextpointperformance.com</p>
        </div>
      </div>
    </body>
    </html>`;

    // Log for debugging
    console.log('Sending email to:', recipientEmail);
    console.log('Number of scores:', scores.length);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Next Point Volleyball <noreply@mail.nextpointperformance.com>',
      to: recipientEmail,
      reply_to: 'info@nextpointperformance.com',
      subject: `Tryout Evaluation - ${tryoutGroup} - Coach ${coachName}`,
      html: emailHtml
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('Email sent successfully:', data.id);

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `Email sent successfully to ${recipientEmail}`,
      emailId: data.id 
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}
