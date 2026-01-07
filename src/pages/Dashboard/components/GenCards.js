/* eslint-disable no-irregular-whitespace */
import React from "react";
import { Loader2, Sun, Zap } from "lucide-react";

// Simplified component - no internal state, just props
const EnergyConsumptionCards = ({ generation, loading, parameters }) => {
  // Use passed generation data
  const solargen = generation?.solargen;
  const loadconsumption = generation?.loadconsumption;

  const CardLoader = () => (
    <div className="flex items-center justify-center h-16">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="bg-white border-b-2 border-gray-100 ">
      <div className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Solar */}
          <div className="relative overflow-hidden flex flex-row bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-500 p-2 ">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 leading-tight">Solar Generation</h3>
                </div>
              </div>

              {loading ? (
                <CardLoader/>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-emerald-700 tracking-tight">
                      {solargen !== undefined && solargen !== null 
                        ? (typeof solargen === 'number' ? solargen.toFixed(2) : solargen)
                        : "N/A"
                      } <span className="text-lg font-medium text-gray-600">{solargen !== undefined && solargen !== null ? "kWh" : ""}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right telemetry */}
            <div className="flex flex-row items-end justify-center ml-auto mt-4 sm:mt-0">
              <div className="bg-white/70 flex flex-row items-center border justify-center px-3 py-2 sm:px-4 sm:py-3 ">
                <span className="font-semibold">{parameters?.SolarVoltage || parameters?.solarVoltage || "0.00"} V</span>
                <span className="mx-3">{` ${"|"} `}</span>
                <span className="font-semibold">{parameters?.SolarCurrent || parameters?.solarCurrent || "0.00"} A</span>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-200/40 blur-2xl"></div>
          </div>

          {/* Load */}
          <div className="relative overflow-hidden flex flex-row bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-500 p-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 leading-tight">Load Consumption</h3>
                </div>
              </div>

              {loading ? (
                <CardLoader/>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-orange-700 tracking-tight">
                    {loadconsumption !== undefined && loadconsumption !== null 
                        ? (typeof loadconsumption === 'number' ? loadconsumption.toFixed(2) : loadconsumption)
                        : "N/A"
                      } <span className="text-lg font-medium text-gray-600">{loadconsumption !== undefined && loadconsumption !== null ? "kWh" : ""}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right telemetry */}
            <div className="flex flex-row items-end justify-center ml-auto mt-4 sm:mt-0">
              <div className="bg-white/70 flex flex-row items-center border justify-center px-3 py-2 sm:px-4 sm:py-3 ">
                <span className="font-semibold">{parameters?.InverterVoltage || parameters?.inverterVoltage || "0.00"} V</span>
                <span className="mx-3">{` ${"|"} `}</span>
                <span className="font-semibold">{parameters?.InverterCurrent || parameters?.inverterCurrent || "0.00"} A</span>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 bg-orange-200/40 blur-2xl"></div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EnergyConsumptionCards;
