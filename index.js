const chalk = require("chalk");
const express = require("express");
const app = express();
const PORT = 3939;
const expressEjsLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const {
    createConnection,
    closeConnection,
} = require("./apps/databases/connection");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const passwordHash = require("./apps/modules/passwordHash");
const reseponseError500 = require("./apps/modules/reseponseError500");
const reseponseError404 = require("./apps/modules/reseponseError404");
const uniqId = require("uniqid");
const { check, validationResult } = require("express-validator");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

// const nanoId = require('nanoid')

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(expressEjsLayouts);
app.use(morgan("dev"));
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("secret"));
app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: 6000 },
    })
);
app.use(flash());

const mainLayout = "layouts/main";

app.use("/", (request, response, next) => {
    console.log("Middleware");
    next();
});

app.get("/", (request, response) => {
    response.status(200).render("index", {
        layout: mainLayout,
        title: "Home",
    });
});

app.get("/dashboard", async (request, response) => {
    try {
        const connection = await createConnection();
        const [users, fields] = await connection.query("select * from users");
        await closeConnection(connection);
        const flashMessages = request.flash("msg");
        response.status(200).render("dashboard", {
            layout: mainLayout,
            title: "Dashboard",
            flashMessages,
            users,
        });
    } catch (err) {
        if (err) {
            reseponseError500(response, mainLayout);
        }
    }
});

app.get("/dashboard/create", (request, response) => {
    response.status(200).render("create", {
        layout: mainLayout,
        title: "Create",
        user: null
    });
});

app.post(
    "/dashboard/create",
    [
        check("name")
            .notEmpty()
            .withMessage("Nama tidak boleh kosong.")
            .custom(async (value) => {
                const connection = await createConnection();
                const [user] = await connection.query(
                    "select * from users where name = ?",
                    value
                );
                await closeConnection(connection);
                if (user[0]) {
                    throw new Error("Nama sudah terdaftar.");
                }
                return true;
            }),
        check("email")
            .notEmpty()
            .withMessage("Email tidak boleh kosong.")
            .isEmail()
            .withMessage("Email tidak sesuai.")
            .custom(async (value) => {
                const connection = await createConnection();
                const [user] = await connection.query(
                    "select * from users where email = ?",
                    value
                );
                await closeConnection(connection);
                if (user[0]) {
                    throw new Error("Email sudah terdaftar.");
                }
                return true;
            }),
        check("phone")
            .notEmpty()
            .withMessage("Nomor HP tidak boleh kosong.")
            .isMobilePhone("id-ID")
            .withMessage("Nomor HP tidak sesuai.")
            .custom(async (value) => {
                const connection = await createConnection();
                const [user] = await connection.query(
                    "select * from users where phone = ?",
                    value
                );
                await closeConnection(connection);
                if (user[0]) {
                    throw new Error("Nomor HP sudah terdaftar.");
                }
                return true;
            }),
    ],
    async (request, response) => {
        const errors = validationResult(request);
        const user = request.body
        if (!errors.isEmpty()) {
            response.status(200).render("create", {
                layout: mainLayout,
                title: "Create",
                errors: errors.array(),
                user
            });
        } else {
            const user = {
                id: uniqId("u-", "-t24"),
                name: request.body.name,
                email: request.body.email,
                phone: request.body.phone,
                password: await passwordHash(request.body.password),
            };
            try {
                const connection = await createConnection();
                await connection.query(
                    `insert into users (id, name, email, phone, password) values ('${user.id}','${user.name}','${user.email}','${user.phone}','${user.password}')`
                );
                await closeConnection(connection);
                request.flash("msg", "User berhasil dimasukkan.");
                response.status(200).redirect("/dashboard");
            } catch (err) {
                if (err) {
                    reseponseError500(response, mainLayout);
                }
            }
        }
    }
);

app.get("/dashboard/:id", async (request, response) => {
    try {
        const connection = await createConnection();
        const [user] = await connection.query(
            "select * from users where id = ?",
            request.params.id
        );
        await closeConnection(connection);
        response.status(200).render("detail", {
            layout: mainLayout,
            title: "Detail ",
            user: user[0],
        });
    } catch (err) {
        if (err) {
            reseponseError500(response, mainLayout);
        }
    }
});

app.delete("/dashboard", async (request, response) => {
    if (request.body.id) {
        try {
            const connection = await createConnection();
            const [user] = await connection.query(
                "select * from users where id = ?",
                request.body.id
            );
            await connection.query("delete from users where id = ?", user[0].id);
            await closeConnection(connection);
            request.flash("msg", "User berhasil dihapus.");
            response.status(200).redirect("/dashboard");
        } catch (err) {
            if (err) {
                reseponseError500(response, mainLayout);
            }
        }
    }
});

app.get('/dashboard/update/:id', async (request, response) => {
    const connection = await createConnection()
    const [user] = await connection.query('select * from users where id = ?', request.params.id)
    response.status(200).render('update', {
        layout: mainLayout,
        title: 'Update',
        user: user[0]
    })
})

app.put("/dashboard", [
    check('name')
        .notEmpty().withMessage('Nama tidak boleh kosong')
        .custom(async (value, { req }) => {
            try {
                const connection = await createConnection()
                const [user] = await connection.query('select * from users where name = ?', value)
                closeConnection(connection)
                if (user[0] && value !== req.body.oldName) {
                    throw new Error('Nama sudah terdaftar.')
                }
                return true
            } catch (err) {
                if (err) throw err
            }

        }),
    check('email')
        .notEmpty().withMessage('Email tidak boleh kosong')
        .isEmail().withMessage('Email tidak sesuai.')
        .custom(async (value, { req }) => {
            try {
                const connection = await createConnection()
                const [user] = await connection.query('select * from users where email = ?', value)
                closeConnection(connection)
                if (user[0] && value !== req.body.oldEmail) {
                    throw new Error('Email sudah terdaftar.')
                }
                return true

            } catch (err) {
                if (err) throw err
            }
        }),
    check('phone')
        .notEmpty().withMessage('Nomor HP tidak boleh kosong')
        .isMobilePhone('id-ID').withMessage('Nomor HP tidak sesuai.')
        .custom(async (value, { req }) => {
            try {
                const connection = await createConnection()
                const [user] = await connection.query('select * from users where phone = ?', value)
                closeConnection(connection)
                if (user[0] && value !== req.body.oldPhone) {
                    throw new Error('Nomor HP sudah terdaftar.')
                }
                return true
            } catch (err) {
                if (err) throw err
            }
        }),
    check('password')
        .notEmpty().withMessage('Password tidak boleh kosong'),
], async (request, response) => {
    const errors = validationResult(request)
    if (!errors.isEmpty()) {
        try {
            const connection = await createConnection()
            const [user] = await connection.query('select * from users where id = ?', request.body.id)
            closeConnection(connection)
            response.status(200).render("update", {
                layout: mainLayout,
                title: "Create",
                errors: errors.array(),
                user: user[0]
            });
        } catch (err) {
            if (err) {
                reseponseError500(response, mainLayout);
            }
        }
    } else {
        const user = {
            id: request.body.id,
            name: request.body.name,
            email: request.body.email,
            phone: request.body.phone,
            password: request.body.password
        }
        try {
            const connection = await createConnection()
            await connection.query(`update users set name = '${user.name}', email = '${user.email}', phone = '${user.phone}', password = '${user.password}' where id = ?`, user.id)
            closeConnection(connection)
            request.flash('msg', 'Data berhasil diperbarui.')
            response.status(200).redirect('/dashboard')
        }
        catch (err) {
            if (err) {
                reseponseError500(response, mainLayout);
            }
        }
    }
});

app.use("/", (request, response) => {
    reseponseError404(response, mainLayout);
});

app.listen(PORT, () => {
    console.log(
        chalk.blue(
            `Server listen on port ${chalk.underline("http://localhost:" + PORT)}`
        )
    );
});
