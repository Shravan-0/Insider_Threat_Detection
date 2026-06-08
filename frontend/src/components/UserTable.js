import React from "react";

function UserTable({ data }) {

  // 🔥 Sort by risk score
  const sortedData = [...data].sort(
    (a, b) => parseFloat(b.risk_score) - parseFloat(a.risk_score)
  );

  return (
    <div>
      <h2>📋 User Risk Table</h2>

      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Reasons</th>
            <th>Login Hour</th>
            <th>Files</th>
            <th>USB</th>
            <th>Emails</th>
            <th>Risk Score</th>
            <th>Risk Level</th>
          </tr>
        </thead>

        <tbody>
          {sortedData.slice(0, 20).map((row, index) => (
            <tr
  key={index}
  style={{
    backgroundColor:
      row.risk_level === "HIGH"
        ? "#ffcccc"
        : row.risk_level === "MEDIUM"
        ? "#fff3cd"
        : "#ccffcc",
  }}
>
  {/* ✅ Reasons FIRST */}
  <td style={{ maxWidth: "250px" }}>
    <ul style={{ paddingLeft: "15px", margin: 0 }}>
      {row.reasons?.map((r, i) => (
        <li key={i} style={{ fontSize: "12px" }}>{r}</li>
      ))}
    </ul>
  </td>

  {/* ✅ Then other fields */}
  <td>{row.login_hour}</td>
  <td>{row.files_accessed}</td>
  <td>{row.usb_usage}</td>
  <td>{row.emails_sent}</td>
  <td>{parseFloat(row.risk_score).toFixed(2)}</td>
  <td>{row.risk_level}</td>
</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;