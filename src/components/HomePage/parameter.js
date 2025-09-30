
import { Sun, Zap, Battery, PlugZap } from "lucide-react";

const getColorAndWidth = (name, type, value) => {

  let color = "bg-gray-500";
  let widthPercentage = "0%";

  if (["Battery 1 Voltage", "Battery 2 Voltage", "Battery 3 Voltage", "Battery 4 Voltage"].includes(name)) {
    if (type === "48v") {
      if (value < 11) {
        color = "bg-red-500";
        widthPercentage = "25%";
      } else if (value >= 15) {
        color = "bg-yellow-500";
        widthPercentage = "100%";
      } else {
        color = "bg-green-500";
        widthPercentage = "50%";
      }
    } else if (type === "24v") {
      if (value < 21) {
        color = "bg-red-500";
        widthPercentage = "25%";
      } else if (value >= 30) {
        color = "bg-yellow-500";
        widthPercentage = "100%";
      } else {
        color = "bg-green-500";
        widthPercentage = "50%";
      }
    } 
  }

  

  if (["Battery 1 Current"].includes(name)) {
    if (value < 2) {
      color = "bg-red-500";
      widthPercentage = "25%";
    } else if (value > 4) {
      color = "bg-yellow-500";
      widthPercentage = "100%";
    } else {
      color = "bg-green-500";
      widthPercentage = "50%";
    }
  }

  return { color, widthPercentage };
};

const Card = ({ icon, name, value, measure, type }) => {
  if (value === "N/A") return null;

  const { color, widthPercentage } = getColorAndWidth(name, type, value);

  return (
    <div className="bg-white w-full border border-gray-300 rounded-xl p-3 flex flex-col min-w-0">
      <div className="flex justify-between items-center">
        <span className="text-gray-700 text-sm">{name}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-lg font-bold mt-1">{`${value.toFixed(2)} ${measure}`}</p>
      <div className="w-full h-2 bg-gray-300 rounded-full mt-2">
        <div
          className={`relative h-2 rounded-full ${color}`}
          style={{ width: widthPercentage }}
        ></div>
      </div>
    </div>
  );
};

const ParameterRepresentation = ({ parameters, device, type }) => {
  const baseData = [
   
    { name: "Battery 1 Voltage", icon: <Battery />, value: "batteryVoltage", measure: "V" },
    { name: "Battery 2 Voltage", icon: <Battery />, value: "batteryVoltage2", measure: "V" },
    { name: "Battery 3 Voltage", icon: <Battery />, value: "batteryVoltage3", measure: "V" },
    { name: "Battery 4 Voltage", icon: <Battery />, value: "batteryVoltage4", measure: "V" },
  ];

  const batteryCurrents = [
    { name: "Battery 1 Current", icon: <Battery />, value: "batteryCurrent", measure: "A" },
  ].filter(item => parameters[item.value] !== undefined && parameters[item.value] !== null);

  const data = [...baseData, ...batteryCurrents];

  return (
    <div className="p-4 md:p-6 lg:p-8 rounded-xl bg-white mx-4 md:mx-0">
      <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">
       Battery
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {data.map((item, index) => {
          const parameterValue = parameters[item.value];
          return (
            <Card
              key={index}
              icon={item.icon}
              name={item.name}
              value={parameterValue ?? "N/A"}
              measure={item.measure}
              type={type}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ParameterRepresentation;
