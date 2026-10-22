// Sends the delivery OTP by SMS through MSG91 once you have an approved DLT template.
// Until MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are set this does nothing and the OTP is shown in the app only.
// Your MSG91 template should contain the variables ##otp## and ##order##.
export async function sendOtpSms({ phone, otp, shortId }) {
  const authkey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authkey || !templateId) return "not_configured";
  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authkey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ template_id: templateId, short_url: "0", recipients: [{ mobiles: "91" + phone, otp, order: shortId }] }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? "sent" : `failed_${res.status}`;
  } catch {
    return "failed";
  }
}
