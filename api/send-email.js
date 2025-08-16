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
      // Build player name with indicators
      let playerDisplay = score.playerName;
      if (score.love) {
        playerDisplay += ' <span style="color: #e74c3c; font-size: 16px;">♥</span>';
      }
      if (score.no) {
        playerDisplay += ' <span style="color: #e74c3c; font-size: 16px;">⊘</span>';
      }
      
      // Build PHD/Coach display
      let phdCoachDisplay = [];
      if (score.phd === true) {
        phdCoachDisplay.push('<span style="color: #28a745; font-weight: bold;">✓ PHD</span>');
      }
      if (score.coachability === true) {
        phdCoachDisplay.push('<span style="color: #5b3cc4; font-weight: bold;">✓ Coach</span>');
      }
      const phdCoachCell = phdCoachDisplay.length > 0 ? phdCoachDisplay.join('<br>') : '-';
      
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${playerDisplay}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${score.tryoutNumber || '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${getScoreBackgroundColor(score.passScore)}; font-weight: bold;">${score.passScore || 0}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${getScoreBackgroundColor(score.setScore)}; font-weight: bold;">${score.setScore || 0}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${getScoreBackgroundColor(score.hitScore)}; font-weight: bold;">${score.hitScore || 0}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${getScoreBackgroundColor(score.serveScore)}; font-weight: bold;">${score.serveScore || 0}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: ${getScoreBackgroundColor(score.overallScore)}; font-weight: bold; font-size: 16px;">${score.overallScore || 0}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; white-space: nowrap;">${phdCoachCell}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${score.notes || '-'}</td>
        </tr>`;
    }).join('');

    // Generate the full HTML email
    const emailHtml = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .email-container { width: 100% !important; }
          .logo { height: 80px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header with Logo -->
              <tr>
                <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                  <img class="logo" src="https://res.cloudinary.com/deh4i8pla/image/upload/v1755304236/tblogo_name_z84yo6.jpg" 
                       alt="Nextpoint Performance" 
                       style="height: 100px; width: auto; display: block; margin: 0 auto;">
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #1a1a1a; margin: 0 0 10px 0; text-align: center; font-size: 24px;">
                    Thunderbolt Power League Fall 2025
                  </h2>
                  <h1 style="color: #333; margin: 0 0 20px 0; text-align: center; font-size: 28px;">
                    Tryout Evaluation Report
                  </h1>
                  
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <p style="margin: 5px 0;"><strong>Coach:</strong> ${coachName}</p>
                    <p style="margin: 5px 0;"><strong>Group:</strong> ${tryoutGroup}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                  </div>
                  
                  <!-- Scores Table -->
                  <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                      <thead>
                        <tr style="background-color: #f0f0f0;">
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Player</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Tryout #</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Pass</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Set</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Hit</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Serve</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Overall</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">PHD/Coach</th>
                          <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${scoreRowsHtml}
                      </tbody>
                    </table>
                  </div>
                  
                  <!-- Summary Stats -->
                  <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">Summary Statistics</h3>
                    <div style="display: flex; justify-content: space-around; text-align: center;">
                      <div>
                        <p style="margin: 5px 0; color: #666; font-size: 12px;">Total Evaluated</p>
                        <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #1a1a1a;">${scores.length}</p>
                      </div>
                      <div>
                        <p style="margin: 5px 0; color: #666; font-size: 12px;">Loves <span style="color: #e74c3c;">♥</span></p>
                        <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #28a745;">${scores.filter(s => s.love === true).length}</p>
                      </div>
                      <div>
                        <p style="margin: 5px 0; color: #666; font-size: 12px;">Nos <span style="color: #e74c3c;">⊘</span></p>
                        <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #dc3545;">${scores.filter(s => s.no === true).length}</p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; background-color: #f8f8f8; text-align: center;">
                  <p style="margin: 0; color: #666; font-size: 14px;">Questions? Contact us at info@nextpointperformance.com</p>
                  <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">© 2025 Nextpoint Performance - Thunderbolt Power League</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    // Log for debugging
    console.log('Sending email to:', recipientEmail);
    console.log('Number of scores:', scores.length);
    console.log('Sample score data:', scores[0]); // Log first score to check phd/coachability values

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Nextpoint Performance <noreply@mail.nextpointperformance.com>',
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
