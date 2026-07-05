export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const email = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(email, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Gmail API error (${response.status}): ${errorBody}`)
  }
}
