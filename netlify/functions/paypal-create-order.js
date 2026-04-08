const fetch = require("node-fetch");

exports.handler = async (event) => {
  const { tourId, people } = JSON.parse(event.body);

  const tours = {
    "gobi-highlights-5d": { 1: 1180, 2: 820, 3: 720, 4: 650 }
  };

  const p = Number(people);
  const perPerson = tours[tourId][p] || tours[tourId][4];
  const total = perPerson * p;
  const deposit = Math.round(total * 0.2);

  const auth = Buffer.from(
    process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET
  ).toString("base64");

  const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: deposit.toString()
          }
        }
      ]
    })
  });

  const data = await orderRes.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
