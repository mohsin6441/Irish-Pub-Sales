const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());
app.use(express.static(__dirname));


/* =========================================================
   STAFF
   STAFF & POSITION IS THE MAIN ROLE CONTROL
========================================================= */

const staff = [
    {
        username: "mohsin",
        name: "Mohsin",
        role: "Owner"
    },
    {
        username: "manager",
        name: "Manager",
        role: "Manager"
    },
    {
        username: "alison",
        name: "Alison Burgurs",
        role: "Staff"
    },
    {
        username: "staff2",
        name: "Staff 2",
        role: "Staff"
    }
];


/* =========================================================
   DATA
========================================================= */

let shifts = [];
let sales = [];


/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


/* =========================================================
   STAFF LIST
========================================================= */

app.get("/api/staff", (req, res) => {

    res.json(staff);

});


/* =========================================================
   FIND STAFF
========================================================= */

function findStaff(username) {

    return staff.find(
        user => user.username === username
    );

}


/* =========================================================
   DISCORD SHIFT NOTIFICATION
   SHIFT WEBHOOK ONLY
========================================================= */

async function sendDiscordShiftNotification(type, shift) {

    const webhookUrl =
        process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {

        console.log(
            "Discord shift webhook not configured."
        );

        return;
    }

    let embed;


    /* =====================================================
       SHIFT START
    ===================================================== */

    if (type === "start") {

        embed = {

            title: "🟢 SHIFT STARTED",

            description:
                "A staff member has started their shift.",

            fields: [

                {
                    name: "👤 Staff",
                    value: shift.staffName,
                    inline: true
                },

                {
                    name: "🏷️ Position",
                    value: shift.role,
                    inline: true
                },

                {
                    name: "🕐 Start Time",

                    value:
                        new Date(
                            shift.startedAt
                        ).toLocaleString(
                            "en-MY",
                            {
                                timeZone:
                                    "Asia/Kuala_Lumpur"
                            }
                        ),

                    inline: false
                }

            ],

            footer: {
                text:
                    "Irish Pub • Developed By Mohsin"
            },

            timestamp:
                new Date().toISOString()

        };

    }


    /* =====================================================
       SHIFT END
    ===================================================== */

    else if (type === "end") {

        const hours =
            Math.floor(
                shift.duration / 3600
            );

        const minutes =
            Math.floor(
                (shift.duration % 3600) / 60
            );

        const seconds =
            shift.duration % 60;


        const totalTime =
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;


        embed = {

            title: "🔴 SHIFT ENDED",

            description:
                "A staff member has ended their shift.",

            fields: [

                {
                    name: "👤 Staff",
                    value: shift.staffName,
                    inline: true
                },

                {
                    name: "🏷️ Position",
                    value: shift.role,
                    inline: true
                },

                {
                    name: "🟢 Shift Start",

                    value:
                        new Date(
                            shift.startedAt
                        ).toLocaleString(
                            "en-MY",
                            {
                                timeZone:
                                    "Asia/Kuala_Lumpur"
                            }
                        ),

                    inline: false
                },

                {
                    name: "🔴 Shift End",

                    value:
                        new Date(
                            shift.endedAt
                        ).toLocaleString(
                            "en-MY",
                            {
                                timeZone:
                                    "Asia/Kuala_Lumpur"
                            }
                        ),

                    inline: false
                },

                {
                    name: "⏱️ Total Duty Time",

                    value:
                        `**${totalTime}**`,

                    inline: false
                }

            ],

            footer: {
                text:
                    "Irish Pub • Developed By Mohsin"
            },

            timestamp:
                new Date().toISOString()

        };

    }


    /* =====================================================
       SEND SHIFT WEBHOOK
    ===================================================== */

    try {

        const response =
            await fetch(
                webhookUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            embeds: [embed]
                        })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Discord shift webhook error:",
                response.status,
                errorText
            );

            return;
        }


        console.log(
            `Discord shift ${type} notification sent.`
        );

    }

    catch (error) {

        console.error(
            "Discord shift webhook connection error:",
            error
        );

    }

}


/* =========================================================
   DISCORD SALES NOTIFICATION
   SALES WEBHOOK ONLY
========================================================= */

async function sendDiscordSaleNotification(sale) {

    const webhookUrl =
        process.env.DISCORD_SALES_WEBHOOK_URL;


    if (!webhookUrl) {

        console.log(
            "Discord sales webhook not configured."
        );

        return;
    }


    /* =====================================================
       ITEM LIST
    ===================================================== */

    let itemLines =
        (sale.items || [])

            .map(item => {

                const quantity =
                    Number(
                        item.quantity || 0
                    );

                const price =
                    Number(
                        item.price || 0
                    );


                return (
                    `• ${item.name} × ${quantity} — ` +
                    `$${(price * quantity).toFixed(2)}`
                );

            })

            .join("\n");


    if (!itemLines) {

        itemLines = "No items";

    }


    /* =====================================================
       DISCORD FIELD LIMIT
    ===================================================== */

    if (itemLines.length > 1024) {

        itemLines =
            itemLines.slice(0, 1021) +
            "...";

    }


    /* =====================================================
       SALE TIME
    ===================================================== */

    const saleTime =

        new Date(
            sale.createdAt || Date.now()
        ).toLocaleString(
            "en-MY",
            {
                timeZone:
                    "Asia/Kuala_Lumpur"
            }
        );


    /* =====================================================
       SALE EMBED
    ===================================================== */

    const embed = {

        title: "🧾 NEW SALE",

        description:
            "A new sale has been completed at Irish Pub.",

        color: 0xD4AF37,


        fields: [

            {
                name: "👤 Staff",

                value:
                    sale.staffName ||
                    sale.username ||
                    "Unknown",

                inline: true
            },


            {
                name: "🕐 Time",

                value:
                    saleTime,

                inline: true
            },


            {
                name: "🛒 Items",

                value:
                    itemLines,

                inline: false
            },


            {
                name: "💰 Subtotal",

                value:
                    `$${Number(
                        sale.subtotal || 0
                    ).toFixed(2)}`,

                inline: true
            },


            {
                name: "🏷️ Discount",

                value:
                    `$${Number(
                        sale.discount || 0
                    ).toFixed(2)}`,

                inline: true
            },


            {
                name: "🧾 Tax 5%",

                value:
                    `$${Number(
                        sale.tax || 0
                    ).toFixed(2)}`,

                inline: true
            },


            {
                name: "💵 Grand Total",

                value:
                    `$${Number(
                        sale.total || 0
                    ).toFixed(2)}`,

                inline: false
            }

        ],


        footer: {

            text:
                "Irish Pub • Developed By Mohsin"

        },


        timestamp:
            new Date().toISOString()

    };


    /* =====================================================
       SEND SALES WEBHOOK
    ===================================================== */

    try {

        const response =
            await fetch(
                webhookUrl,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            embeds: [embed]
                        })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Discord sales webhook error:",
                response.status,
                errorText
            );

            return;
        }


        console.log(
            "Discord sale notification sent."
        );

    }

    catch (error) {

        console.error(
            "Discord sales webhook connection error:",
            error
        );

    }

}


/* =========================================================
   MANAGEMENT ACCESS
   OWNER + MANAGER
========================================================= */

function hasManagementAccess(username) {

    const user =
        findStaff(username);


    if (!user) {

        return false;

    }


    return (

        user.role === "Owner" ||

        user.role === "Manager"

    );

}


/* =========================================================
   SHIFT START
========================================================= */

app.post(
    "/api/shift/start",
    (req, res) => {

        const { username } =
            req.body;


        const user =
            findStaff(username);


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Staff not found."

            });

        }


        const existingShift =
            shifts.find(
                shift =>
                    shift.username ===
                        user.username &&
                    shift.active === true
            );


        if (existingShift) {

            return res.status(400).json({

                success: false,

                message:
                    "You already have an active shift.",

                startedAt:
                    existingShift.startedAt

            });

        }


        const shift = {

            id:
                Date.now(),

            username:
                user.username,

            staffName:
                user.name,

            role:
                user.role,

            startedAt:
                new Date().toISOString(),

            endedAt:
                null,

            active:
                true,

            duration:
                0

        };


        shifts.push(shift);


        console.log(
            `SHIFT STARTED: ${user.name}`
        );


        /* =================================================
           SEND SHIFT START DISCORD
        ================================================= */

        sendDiscordShiftNotification(
            "start",
            shift
        );


        res.json({

            success: true,

            message:
                "Shift started successfully.",

            startedAt:
                shift.startedAt,

            shift

        });

    }
);


/* =========================================================
   CURRENT SHIFT
========================================================= */

app.get(
    "/api/shift/current",
    (req, res) => {

        const { username } =
            req.query;


        const user =
            findStaff(username);


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Staff not found."

            });

        }


        const shift =
            shifts.find(
                item =>
                    item.username ===
                        user.username &&
                    item.active === true
            );


        if (!shift) {

            return res.json({

                active: false

            });

        }


        res.json({

            active: true,

            startedAt:
                shift.startedAt,

            shift

        });

    }
);


/* =========================================================
   SHIFT END
========================================================= */

app.post(
    "/api/shift/end",
    (req, res) => {

        const { username } =
            req.body;


        const user =
            findStaff(username);


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Staff not found."

            });

        }


        const shift =
            shifts.find(
                item =>
                    item.username ===
                        user.username &&
                    item.active === true
            );


        if (!shift) {

            return res.status(400).json({

                success: false,

                message:
                    "No active shift found."

            });

        }


        const endedAt =
            new Date();


        const startedAt =
            new Date(
                shift.startedAt
            );


        const duration =
            Math.floor(
                (endedAt - startedAt) /
                    1000
            );


        shift.endedAt =
            endedAt.toISOString();


        shift.active =
            false;


        shift.duration =
            Math.max(
                0,
                duration
            );


        console.log(
            `SHIFT ENDED: ${user.name} - ${duration}s`
        );


        /* =================================================
           SEND SHIFT END DISCORD
        ================================================= */

        sendDiscordShiftNotification(
            "end",
            shift
        );


        res.json({

            success: true,

            message:
                "Shift ended successfully.",

            endedAt:
                shift.endedAt,

            duration:
                shift.duration,

            shift

        });

    }
);


/* =========================================================
   SALES
========================================================= */

app.post(
    "/api/sales",
    (req, res) => {

        const {

            username,

            staffName,

            items,

            subtotal,

            discount,

            tax,

            total

        } = req.body;


        const user =
            findStaff(username);


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Staff not found."

            });

        }


        const activeShift =
            shifts.find(
                shift =>
                    shift.username ===
                        user.username &&
                    shift.active === true
            );


        if (!activeShift) {

            return res.status(400).json({

                success: false,

                message:
                    "Please start your shift before making a sale."

            });

        }


        if (

            !Array.isArray(items) ||

            items.length === 0

        ) {

            return res.status(400).json({

                success: false,

                message:
                    "No items in sale."

            });

        }


        const sale = {

            id:
                Date.now(),

            username:
                user.username,

            staffName:
                user.name,

            items,

            subtotal:
                Number(subtotal) || 0,

            discount:
                Number(discount) || 0,

            tax:
                Number(tax) || 0,

            total:
                Number(total) || 0,

            createdAt:
                new Date().toISOString()

        };


        sales.push(sale);


        /* =================================================
           SEND SALE TO SALES DISCORD WEBHOOK
           NOT SHIFT WEBHOOK
        ================================================= */

        sendDiscordSaleNotification(
            sale
        );


        console.log(
            `SALE: ${sale.staffName} - $${sale.total.toFixed(2)}`
        );


        res.json({

            success: true,

            message:
                "Sale completed successfully.",

            sale

        });

    }
);


/* =========================================================
   DASHBOARD
   ONLY OWNER + MANAGER
========================================================= */

app.get(
    "/api/dashboard",
    (req, res) => {

        const { username } =
            req.query;


        /* ================================================
           SERVER-SIDE PERMISSION CHECK
        ================================================ */

        if (
            !hasManagementAccess(
                username
            )
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only Owner or Manager can access the dashboard."

            });

        }


        /* ================================================
           TOTAL SALES
        ================================================ */

        const totalSales =
            sales.reduce(
                (sum, sale) =>
                    sum +
                    Number(
                        sale.total || 0
                    ),

                0
            );


        /* ================================================
           TOTAL ORDERS
        ================================================ */

        const totalOrders =
            sales.length;


        /* ================================================
           TOTAL DUTY TIME
        ================================================ */

        const totalDutyTime =
            shifts.reduce(
                (sum, shift) =>
                    sum +
                    Number(
                        shift.duration || 0
                    ),

                0
            );


        /* ================================================
           TODAY SALES
        ================================================ */

        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        const todaySales =
            sales

                .filter(
                    sale =>
                        sale.createdAt &&
                        sale.createdAt.startsWith(
                            today
                        )
                )

                .reduce(
                    (sum, sale) =>
                        sum +
                        Number(
                            sale.total || 0
                        ),

                    0
                );


        /* ================================================
           STAFF PERFORMANCE
        ================================================ */

        const staffPerformance =
            staff.map(user => {

                const userSales =
                    sales.filter(
                        sale =>
                            sale.username ===
                            user.username
                    );


                const userSalesTotal =
                    userSales.reduce(
                        (sum, sale) =>
                            sum +
                            Number(
                                sale.total || 0
                            ),

                        0
                    );


                const userDutyTime =
                    shifts

                        .filter(
                            shift =>
                                shift.username ===
                                user.username
                        )

                        .reduce(
                            (sum, shift) =>
                                sum +
                                Number(
                                    shift.duration || 0
                                ),

                            0
                        );


                return {

                    username:
                        user.username,

                    name:
                        user.name,

                    role:
                        user.role,

                    orders:
                        userSales.length,

                    sales:
                        userSalesTotal,

                    dutyTime:
                        userDutyTime

                };

            });


        /* ================================================
           RECENT SALES
        ================================================ */

        const recentSales =
            [...sales]

                .sort(
                    (a, b) =>
                        new Date(
                            b.createdAt
                        ) -
                        new Date(
                            a.createdAt
                        )
                )

                .slice(0, 10);


        /* ================================================
           RESPONSE
        ================================================ */

        res.json({

            success: true,

            totalSales,

            totalOrders,

            totalDutyTime,

            todaySales,

            staffPerformance,

            recentSales

        });

    }
);


/* =========================================================
   RESET DASHBOARD
   ONLY OWNER + MANAGER
========================================================= */

app.post(
    "/api/dashboard/reset",
    (req, res) => {

        const { username } =
            req.body;


        if (
            !hasManagementAccess(
                username
            )
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only Owner or Manager can reset dashboard."

            });

        }


        const confirmedUser =
            findStaff(username);


        sales = [];

        shifts = [];


        console.log(
            `DASHBOARD RESET BY: ${
                confirmedUser
                    ? confirmedUser.name
                    : username
            }`
        );


        res.json({

            success: true,

            message:
                "Dashboard data reset successfully."

        });

    }
);


/* =========================================================
   STAFF ROLE UPDATE
   STAFF & POSITION IS THE ONLY ROLE CONTROL
========================================================= */

app.post(
    "/api/staff/roles",
    (req, res) => {

        try {

            const username =
                req.body?.username;

            const changes =
                req.body?.changes;


            console.log(
                "STAFF ROLE UPDATE:",
                username,
                changes
            );


            /* ==============================================
               FIND CURRENT USER
            ============================================== */

            const currentUser =
                findStaff(username);


            if (!currentUser) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Staff not found."

                });

            }


            /* ==============================================
               ONLY OWNER OR MANAGER
            ============================================== */

            if (

                currentUser.role !== "Owner" &&

                currentUser.role !== "Manager"

            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only Owner or Manager can change staff positions."

                });

            }


            /* ==============================================
               VALIDATE CHANGES
            ============================================== */

            if (
                !Array.isArray(changes)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid staff changes."

                });

            }


            /* ==============================================
               ALLOWED ROLES
            ============================================== */

            const allowedRoles = [

                "Owner",

                "Manager",

                "Staff"

            ];


            /* ==============================================
               VALIDATE EACH STAFF
            ============================================== */

            for (
                const change
                of changes
            ) {

                if (

                    !change ||

                    !change.username ||

                    !change.role

                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid staff data."

                    });

                }


                if (
                    !allowedRoles.includes(
                        change.role
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            `Invalid role: ${change.role}`

                    });

                }


                const targetUser =
                    findStaff(
                        change.username
                    );


                if (!targetUser) {

                    return res.status(404).json({

                        success: false,

                        message:
                            `Staff not found: ${change.username}`

                    });

                }

            }


            /* ==============================================
               CALCULATE FINAL ROLES
            ============================================== */

            const finalRoles =
                staff.map(user => {

                    const change =
                        changes.find(
                            item =>
                                item.username
                                    .toLowerCase() ===
                                user.username
                                    .toLowerCase()
                        );


                    return {

                        username:
                            user.username,

                        role:
                            change
                                ? change.role
                                : user.role

                    };

                });


            /* ==============================================
               MUST HAVE AT LEAST ONE OWNER
            ============================================== */

            const ownerCount =
                finalRoles.filter(
                    user =>
                        user.role ===
                        "Owner"
                ).length;


            if (
                ownerCount < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "There must always be at least one Owner."

                });

            }


            /* ==============================================
               APPLY ROLE CHANGES
            ============================================== */

            changes.forEach(
                change => {

                    const targetUser =
                        findStaff(
                            change.username
                        );


                    if (targetUser) {

                        targetUser.role =
                            change.role;

                    }

                }
            );


            console.log(
                "UPDATED STAFF:",
                staff
            );


            /* ==============================================
               RETURN FRESH SERVER STAFF LIST
            ============================================== */

            return res.status(200).json({

                success: true,

                message:
                    "Staff positions updated successfully.",

                staff:
                    staff

            });

        }

        catch (error) {

            console.error(
                "STAFF ROLE UPDATE ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server error while saving staff positions.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   API 404
   ALWAYS RETURN JSON FOR UNKNOWN API ROUTES
========================================================= */

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith("/api/")
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "API endpoint not found."

            });

        }

        next();

    }
);


/* =========================================================
   SPA FALLBACK
========================================================= */

app.use(
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


/* =========================================================
   SERVER START
========================================================= */

app.listen(
    PORT,
    () => {

        console.log(
            `Irish Pub Management System running at http://localhost:${PORT}`
        );

    }
);