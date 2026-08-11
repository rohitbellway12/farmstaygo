import "dotenv/config";
import app from "./app.js";
import { getBackendBaseUrl } from "./config/url.js";

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(
    `FarmStayGo API running at ${getBackendBaseUrl()}`
  );
});
