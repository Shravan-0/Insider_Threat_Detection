import React, { useEffect, useState } from "react";
import { configApi } from "../services/api";

function ManagerPanel({ onUpdate }) {
  const preventWheelChange = (e) => {
    e.target.blur();
   };
  const [fileThreshold, setFileThreshold] = useState(50);
  const [emailThreshold, setEmailThreshold] = useState(20);

  useEffect(() => {
    configApi.getConfig().then(data => {
      setFileThreshold(data.fileHigh ?? data.file_threshold);
      setEmailThreshold(data.emailHigh ?? data.email_threshold);
    });
  }, []);

  const updateConfig = async () => {
    const payload = {
      fileHigh: Number(fileThreshold),
      emailHigh: Number(emailThreshold)
    };
    console.log("CONFIG SAVE PAYLOAD", payload);
    await configApi.updateConfig(payload);

    alert("Config Updated!");
    if (onUpdate) onUpdate();
  };

  return (
    <div>
      <h2>⚙️ Manager Control Panel</h2>

      <label>File High Threshold:</label>
      <input
        type="number"
        value={fileThreshold}
        onChange={(e) => setFileThreshold(e.target.value)}
        onWheel={preventWheelChange}
      />

      <br />
      <label>Email High Threshold:</label>
      <input
        type="number"
        value={emailThreshold}
        onChange={(e) => setEmailThreshold(e.target.value)}
        onWheel={preventWheelChange}
      />

      <br />
      <br />

      <button onClick={updateConfig}>Update</button>
    </div>
  );
}

export default ManagerPanel;
