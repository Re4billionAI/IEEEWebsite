import { Battery, Zap, Activity } from "lucide-react";

const getColorAndWidth = (name, type, value) => {
  let color = "bg-gray-500";
  let widthPercentage = "0%";
  let status = "Unknown";

  if (["Battery 1 Voltage", "Battery 2 Voltage", "Battery 3 Voltage", "Battery 4 Voltage"].includes(name)) {
    if (type === "48v") {
      if (value < 11) {
        color = "bg-red-500";
        widthPercentage = "25%";
        status = "Low";
      } else if (value >= 15) {
        color = "bg-emerald-500";
        widthPercentage = "100%";
        status = "Optimal";
      } else {
        color = "bg-yellow-500";
        widthPercentage = "50%";
        status = "Medium";
      }
    } else if (type === "24v") {
      if (value < 21) {
        color = "bg-red-500";
        widthPercentage = "25%";
        status = "Low";
      } else if (value >= 30) {
        color = "bg-emerald-500";
        widthPercentage = "100%";
        status = "Optimal";
      } else {
        color = "bg-yellow-500";
        widthPercentage = "50%";
        status = "Medium";
      }
    }
  }

  if (["Battery 1 Current"].includes(name)) {
    if (value < 2) {
      color = "bg-blue-500";
      widthPercentage = "25%";
      status = "Idle";
    } else if (value > 4) {
      color = "bg-emerald-500";
      widthPercentage = "100%";
      status = "Active";
    } else {
      color = "bg-blue-400";
      widthPercentage = "50%";
      status = "Charging";
    }
  }

  return { color, widthPercentage, status };
};

const Card = ({ icon, name, value, measure, type }) => {
  if (value === "N/A") return null;

  const { color, widthPercentage, status } = getColorAndWidth(name, type, value);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-full relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
      
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${color.replace('bg-', 'bg-').replace('500', '100')} ${color.replace('bg-', 'text-').replace('500', '700')}`}>
          {status}
        </span>
      </div>

      <div>
        <h4 className="text-gray-500 text-sm font-medium mb-1">{name}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-800">{value.toFixed(2)}</span>
          <span className="text-sm text-gray-500 font-medium">{measure}</span>
        </div>
      </div>
    </div>
  );
};

const ParameterRepresentation = ({ parameters, device, type }) => {
  const baseData = [
    { name: "Battery 1 Voltage", icon: <Battery className="w-5 h-5 text-emerald-600" />, value: "batteryVoltage", measure: "V" },
    { name: "Battery 2 Voltage", icon: <Battery className="w-5 h-5 text-emerald-600" />, value: "batteryVoltage2", measure: "V" },
    { name: "Battery 3 Voltage", icon: <Battery className="w-5 h-5 text-emerald-600" />, value: "batteryVoltage3", measure: "V" },
    { name: "Battery 4 Voltage", icon: <Battery className="w-5 h-5 text-emerald-600" />, value: "batteryVoltage4", measure: "V" },
  ];

  const batteryCurrents = [
    { name: "Battery 1 Current", icon: <Activity className="w-5 h-5 text-blue-600" />, value: "batteryCurrent", measure: "A" },
  ].filter(item => parameters[item.value] !== undefined && parameters[item.value] !== null);

  const data = [...baseData, ...batteryCurrents];

  return (
    <div className="mt-8 mb-8">
      <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Zap className="w-5 h-5 text-emerald-700" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Battery Status</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 md:px-0">
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
