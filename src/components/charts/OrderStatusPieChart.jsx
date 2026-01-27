// file: src/components/charts/OrderStatusPieChart.jsx
import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function OrderStatusPieChart({ data }) {
  const chartData = {
    labels: ["Diterima", "Proses Cuci", "Siap Diambil"],
    datasets: [
      {
        label: "Jumlah Order",
        data: [data.diterima, data.proses_cuci, data.siap_diambil],
        backgroundColor: [
          "rgba(54, 162, 235, 0.8)", // Blue
          "rgba(255, 206, 86, 0.8)", // Yellow
          "rgba(139, 92, 246, 0.8)", // Purple
        ],
        borderColor: [
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(139, 92, 246, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#cbd5e1", // slate-300
        },
      },
      title: {
        display: true,
        text: "Komposisi Order Aktif",
        color: "#f1f5f9", // slate-100
      },
    },
  };

  return <Pie data={chartData} options={options} />;
}

export default OrderStatusPieChart;
