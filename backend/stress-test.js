
require("dotenv").config();

const autocannon = require("autocannon");

const token = process.env.TEST_TOKEN;
const url =
  process.env.TEST_URL || "http://localhost:3000/groups";

if (!token) {
  console.error("TEST_TOKEN is not configured");
  process.exit(1);
}

const instance = autocannon(
  {
    url,
    method: "GET",
    connections: 10,
    duration: 20,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
  (err, result) => {
    if (err) {
      console.error("Ошибка нагрузочного тестирования:", err);
      return;
    }

    console.log("Нагрузочное тестирование завершено");
    console.log(`Всего запросов: ${result.requests.total}`);
    console.log(`Запросов в секунду: ${result.requests.average}`);
    console.log(`Средняя задержка: ${result.latency.average} мс`);
    console.log(`Ошибки: ${result.errors}`);
    console.log(`Таймауты: ${result.timeouts}`);
  }
);

autocannon.track(instance);
