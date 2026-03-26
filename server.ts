import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // EMI Calculation Endpoint
  app.post("/api/emi-calculate", (req, res) => {
    const { principal, annualRate, tenureMonths } = req.body;
    
    const P = parseFloat(principal);
    const annualR = parseFloat(annualRate);
    const N = parseInt(tenureMonths);

    if (isNaN(P) || isNaN(annualR) || isNaN(N) || P <= 0 || N <= 0 || annualR < 0) {
      return res.status(400).json({ error: "Invalid or missing parameters. Principal and Tenure must be positive numbers." });
    }

    let emi: number;
    let totalPayment: number;
    let totalInterest: number;

    if (annualR === 0) {
      emi = P / N;
      totalPayment = P;
      totalInterest = 0;
    } else {
      const R = (annualR / 12) / 100;
      // EMI = [P × R × (1+R)^N] / [(1+R)^N – 1]
      emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
      totalPayment = emi * N;
      totalInterest = totalPayment - P;
    }

    res.json({
      emi: Math.round(emi * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      principal: P,
      breakdown: {
        principalPercent: totalPayment > 0 ? Math.round((P / totalPayment) * 100) : 0,
        interestPercent: totalPayment > 0 ? Math.round((totalInterest / totalPayment) * 100) : 0
      }
    });
  });

  // Loan Rates Endpoint (Mocking real-time data for now)
  app.get("/api/loan-rates", (req, res) => {
    res.json({
      rbiRepoRate: "6.50%",
      lastUpdated: new Date().toISOString(),
      banks: [
        { name: "SBI", homeLoan: "8.50% - 9.15%", personalLoan: "11.15% - 14.30%", carLoan: "8.75% - 9.60%", educationalLoan: "8.15% - 11.15%", vehicleLoan: "8.75% - 9.60%", goldLoan: "8.50% - 9.50%" },
        { name: "HDFC Bank", homeLoan: "8.75% - 9.45%", personalLoan: "10.50% - 17.99%", carLoan: "8.80% - 9.50%", educationalLoan: "9.50% - 13.50%", vehicleLoan: "8.80% - 9.50%", goldLoan: "9.00% - 11.00%" },
        { name: "ICICI Bank", homeLoan: "8.75% - 9.65%", personalLoan: "10.75% - 19.00%", carLoan: "8.85% - 9.60%", educationalLoan: "9.50% - 14.00%", vehicleLoan: "8.85% - 9.60%", goldLoan: "9.50% - 12.00%" },
        { name: "Axis Bank", homeLoan: "8.75% - 9.35%", personalLoan: "10.49% - 21.00%", carLoan: "9.10% - 9.80%", educationalLoan: "9.70% - 13.70%", vehicleLoan: "9.10% - 9.80%", goldLoan: "9.25% - 11.50%" }
      ],
      disclaimer: "Rates are subject to change based on RBI policies and bank discretion."
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lonix Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
