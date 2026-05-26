const autocannon = require("autocannon");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Nzk3MzMzNDUsImV4cCI6MTc3OTc2MjE0NX0.Feafx_MNHqNZe9TJKgew_EIekAAuyGRZlVVSQH7PdCQ";

const instance = autocannon(
  {
    url: "https://info-system-backend.onrender.com/groups",
    method: "GET",
    connections: 1000,
    duration: 20,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
  (err, result) => {
    if (err) {
      console.error("Ошибка при выполнении стресс-теста:", err);
      return;
    }

    console.log("Стресс-тест завершён");
    console.log(`Всего запросов: ${result.requests.total}`);
    console.log(`Среднее количество запросов в секунду: ${result.requests.average}`);
    console.log(`Средняя задержка: ${result.latency.average} мс`);
    console.log(`Минимальная задержка: ${result.latency.min} мс`);
    console.log(`Максимальная задержка: ${result.latency.max} мс`);
    console.log(`Ошибки: ${result.errors}`);
    console.log(`Таймауты: ${result.timeouts}`);
  }
);

autocannon.track(instance);