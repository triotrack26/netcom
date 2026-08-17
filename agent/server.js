const http = require("http");
const os = require("os");

const si = require("systeminformation");

const PORT = 47821;


// --------------------------------------------------
// CORS
// --------------------------------------------------

function corsHeaders() {

    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
            "GET, OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type",
        "Cache-Control":
            "no-store"
    };
}


// --------------------------------------------------
// JSON RESPONSE
// --------------------------------------------------

function sendJSON(
    response,
    data,
    status = 200
) {

    response.writeHead(
        status,
        {
            ...corsHeaders(),
            "Content-Type":
                "application/json; charset=utf-8"
        }
    );

    response.end(
        JSON.stringify(data)
    );
}


// --------------------------------------------------
// SYSTEM
// --------------------------------------------------

async function getSystemInfo() {

    const [
        system,
        baseboard,
        cpu,
        mem,
        graphics,
        osInfo,
        temp,
        diskLayout
    ] = await Promise.all([

        si.system(),

        si.baseboard(),

        si.cpu(),

        si.mem(),

        si.graphics(),

        si.osInfo(),

        si.cpuTemperature(),

        si.diskLayout()

    ]);


    const memoryModules =
        await si.memLayout();


    const ramSpeed =
        memoryModules.length > 0
            ? Math.max(
                ...memoryModules
                    .map(
                        m => Number(m.clockSpeed) || 0
                    )
            )
            : null;


    const storage =
        diskLayout.map(
            disk => {

                return {

                    model:
                        disk.name ||
                        disk.device ||
                        "Unknown",

                    sizeGB:
                        disk.size
                            ? Number(
                                (
                                    disk.size /
                                    1024 /
                                    1024 /
                                    1024
                                ).toFixed(2)
                            )
                            : null,

                    type:
                        disk.type ||
                        "Unknown",

                    temperatureC:
                        disk.temperature ??
                        null,

                    health:
                        disk.smartStatus === "Ok"
                            ? 100
                            : null
                };

            }
        );


    return {

        manufacturer:
            system.manufacturer,

        model:
            system.model,

        serial:
            system.serial,

        motherboard:
            baseboard.product ||
            baseboard.manufacturer ||
            null,

        motherboardSerial:
            baseboard.serial ||
            null,

        cpu: {

            name:
                cpu.brand,

            manufacturer:
                cpu.manufacturer,

            cores:
                cpu.cores,

            physicalCores:
                cpu.physicalCores,

            speedGHz:
                cpu.speed,

            temperatureC:
                temp.main ??
                null
        },


        ram: {

            totalGB:
                Number(
                    (
                        mem.total /
                        1024 /
                        1024 /
                        1024
                    ).toFixed(2)
                ),

            speedMHz:
                ramSpeed || null
        },


        storage,


        os: {

            name:
                osInfo.distro ||
                osInfo.platform,

            version:
                osInfo.release,

            build:
                osInfo.build,

            architecture:
                osInfo.arch
        },


        display:
            graphics.displays.map(
                display => ({

                    model:
                        display.model,

                    vendor:
                        display.vendor,

                    resolution:
                        display.currentResX &&
                        display.currentResY
                            ? `${display.currentResX} x ${display.currentResY}`
                            : null,

                    refreshRate:
                        display.currentRefreshRate
                })
            )
    };
}


// --------------------------------------------------
// BATTERY
// --------------------------------------------------

async function getBattery() {

    const battery =
        await si.battery();


    let health = null;


    if (
        battery.designCapacity &&
        battery.maxCapacity
    ) {

        health =
            (
                battery.maxCapacity /
                battery.designCapacity
            ) * 100;
    }


    return {

        percent:
            battery.percent,

        charging:
            battery.isCharging,

        model:
            battery.model ||
            null,

        manufacturer:
            battery.manufacturer ||
            null,

        designCapacityWh:
            battery.designCapacity
                ? Number(
                    (
                        battery.designCapacity /
                        1000
                    ).toFixed(2)
                )
                : null,

        fullChargeCapacityWh:
            battery.maxCapacity
                ? Number(
                    (
                        battery.maxCapacity /
                        1000
                    ).toFixed(2)
                )
                : null,

        currentCapacityWh:
            battery.currentCapacity
                ? Number(
                    (
                        battery.currentCapacity /
                        1000
                    ).toFixed(2)
                )
                : null,

        voltage:
            battery.voltage ||
            null,

        cycleCount:
            battery.cycleCount ||
            null,

        health:
            health !== null
                ? Number(
                    health.toFixed(1)
                )
                : null
    };
}


// --------------------------------------------------
// PORTS / USB
// --------------------------------------------------

async function getPorts() {

    const usb =
        await si.usb();


    return {

        devices:
            usb.map(
                device => ({

                    name:
                        device.name ||
                        device.deviceName ||
                        "USB Device",

                    type:
                        device.type ||
                        "USB",

                    manufacturer:
                        device.manufacturer ||
                        null,

                    vendorId:
                        device.vendorId ||
                        null,

                    productId:
                        device.productId ||
                        null,

                    serialNumber:
                        device.serialNumber ||
                        null
                })
            )
    };
}


// --------------------------------------------------
// NETWORK
// --------------------------------------------------

async function getNetwork() {

    const interfaces =
        await si.networkInterfaces();


    return {

        interfaces:
            interfaces.map(
                network => ({

                    name:
                        network.iface,

                    type:
                        network.type,

                    speedMbps:
                        network.speed,

                    mac:
                        network.mac,

                    ip4:
                        network.ip4,

                    operstate:
                        network.operstate
                })
            )
    };
}


// --------------------------------------------------
// HTTP SERVER
// --------------------------------------------------

const server =
    http.createServer(
        async (request, response) => {

            if (
                request.method ===
                "OPTIONS"
            ) {

                response.writeHead(
                    204,
                    corsHeaders()
                );

                response.end();

                return;
            }


            try {

                if (
                    request.url ===
                    "/api/system"
                ) {

                    const data =
                        await getSystemInfo();

                    sendJSON(
                        response,
                        data
                    );

                    return;
                }


                if (
                    request.url ===
                    "/api/battery"
                ) {

                    const data =
                        await getBattery();

                    sendJSON(
                        response,
                        data
                    );

                    return;
                }


                if (
                    request.url ===
                    "/api/ports"
                ) {

                    const data =
                        await getPorts();

                    sendJSON(
                        response,
                        data
                    );

                    return;
                }


                if (
                    request.url ===
                    "/api/network"
                ) {

                    const data =
                        await getNetwork();

                    sendJSON(
                        response,
                        data
                    );

                    return;
                }


                if (
                    request.url ===
                    "/api/status"
                ) {

                    sendJSON(
                        response,
                        {
                            online: true,
                            hostname:
                                os.hostname(),
                            platform:
                                process.platform,
                            node:
                                process.version
                        }
                    );

                    return;
                }


                sendJSON(
                    response,
                    {
                        error:
                            "API endpoint not found"
                    },
                    404
                );

            } catch (error) {

                console.error(
                    error
                );

                sendJSON(
                    response,
                    {
                        error:
                            error.message
                    },
                    500
                );
            }

        }
    );


server.listen(
    PORT,
    "127.0.0.1",
    () => {

        console.log("");
        console.log(
            "===================================="
        );

        console.log(
            "       LAPTOP ANALYZER AGENT"
        );

        console.log(
            "===================================="
        );

        console.log(
            `Agent running on http://127.0.0.1:${PORT}`
        );

        console.log(
            "Keep this window running while testing."
        );

        console.log("");
    }
);
