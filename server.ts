import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for eSewa Signature
  app.post("/api/payment/esewa/initiate", (req, res) => {
    try {
      const { amount, transaction_uuid, product_code } = req.body;
      const secretKey = process.env.VITE_ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
      const message = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
      
      const hmac = crypto.createHmac("sha256", secretKey);
      hmac.update(message);
      const signature = hmac.digest("base64");
      
      res.json({ signature, message });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate eSewa signature" });
    }
  });

  // API Route for Khalti Initiation
  app.post("/api/payment/khalti/initiate", async (req, res) => {
    try {
      const { return_url, website_url, amount, purchase_order_id, purchase_order_name, customer_info } = req.body;
      const authKey = process.env.VITE_KHALTI_SECRET_KEY;
      if (!authKey || authKey === "Key test_secret_key_from_dashboard") {
         return res.status(400).json({ error: "API keys are not configured properly. Please configure VITE_KHALTI_SECRET_KEY in the environment." });
      }

      const khaltiResponse = await fetch("https://a.khalti.com/api/v2/epayment/initiate/", {
        method: "POST",
        headers: {
          "Authorization": `${authKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_url,
          website_url,
          amount,
          purchase_order_id,
          purchase_order_name,
          customer_info,
        })
      });

      const data = await khaltiResponse.json();
      if (!khaltiResponse.ok) {
        return res.status(khaltiResponse.status).json(data);
      }
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to initiate Khalti payment" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
