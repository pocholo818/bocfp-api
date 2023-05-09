const express = require('express');
const app = express();
const cors = require("cors");
const https = require('https');
const fs = require('fs');

var moment = require('moment');
const jwt = require('jsonwebtoken')
require("dotenv").config();

const port = 5000;
app.use(cors())
app.use(express.json({ limit: '50mb' }));

const ACCESS_TOKEN_SECRET = 'cdbd59409f55e364b9e993dc65ca6148efc8d7b433366ab69474cce37daf40221218ad23464ee283da6df07a79930d67f0ed88951e1c22529686ea73817dd32c'
const REFRESH_TOKEN_SECRET = 'c89d5f45bc3e8cc0fa59986fdd47fb1b19388d2dbed809c72d56b70dc5bdfd15098386b018172123de635ae0602e4cc58098d2bc5bcad336f7c49d5a5f627d3a'

const mysql = require('mysql');
const connection = mysql.createConnection({
  // host: 'auth-db946.hstgr.io',
  // user: 'u621496327_bocfp',
  // password: 'Bocfp2022$',
  // database: 'u621496327_bocfp'
  host: 'localhost',
  user:  'root',
  password: '',
  database: 'bocfp'
})

function authenticateToken(admin_power) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, userInfo) => {
      if (err) return res.sendStatus(403)

      // wip
      if (admin_power === 1 && userInfo.admin_power !== 1) {
        return res.sendStatus(401)
      }

      req.user = userInfo
      next()
    })
  }
}

function generateAccessToken(userInfo) {
  return accessToken = jwt.sign(userInfo, ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
}

// funct
function bmi(height, weight, output) {
  const bmi = (weight / (height * height)) * 10000;
  let remark;

  if (bmi >= 30.0) {
    remark = "Obese";
  }
  else if (bmi >= 25.0) {
    remark = "Overweight";
  }
  else if (bmi >= 18.5) {
    remark = "Normal";
  }
  else if (bmi <= 18.4) {
    remark = "Underweight";
  }

  return [remark, bmi];
};
// name format
function nameFormat(string) {
  return string
    .toLowerCase().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

app.get('/test', (req, res) => {
  connection.query(`SELECT * FROM child WHERE soft_delete = 0`, (err, rows, fields) => {
    if (err) throw err
    res.json(rows)
  })
})

// get user login
app.post('/user/login', (req, res) => {
  const { username, password } = req.body

  connection.query(`SELECT * FROM user WHERE username='${username}' AND password='${password}' AND soft_delete = 0`, (err, rows, fields) => {
    console.log(rows)
    if (!rows[0]) {
      return res.status(401).json({ "message": "Incorrect Username or Password" })
    }
    else if (rows[0].username == username && rows[0].password == password) {

      const userInfo = {
        fname: rows[0].fname,
        admin_power: rows[0].admin_power,
        id: rows[0].user_id
      }

      const accessToken = generateAccessToken(userInfo)
      const refreshToken = jwt.sign(userInfo, REFRESH_TOKEN_SECRET)

      connection.query(`UPDATE user SET refresh_token = '${refreshToken}' WHERE user_id = ${userInfo.id}`, (err, rows, fields) => {
        if (err) throw err
      })

      res.json({
        "message": "Success!",
        accessToken: accessToken,
        refreshToken: refreshToken,
        user_id: rows[0].user_id,
        fname: rows[0].fname,
        admin_power: rows[0].admin_power,
      })
    }
  })
});

app.post('/user/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken == null) {
    return res.sendStatus(401)
  }

  connection.query(`SELECT refresh_token FROM user WHERE refresh_token = '${refreshToken}'`, (err, rows, fields) => {
    if (err) throw err
    else if (!rows[0]) {
      return res.sendStatus(403)
    }

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, userInfo) => {
      if (err) return res.sendStatus(403)
      const accessToken = generateAccessToken({ fname: userInfo.fname, role: userInfo.role, id: userInfo.id, admin_power: userInfo.admin_power })
      res.json({ accessToken: accessToken })
    })
  })
})

app.delete('/user/logout', (req, res) => {
  refreshTokens = refreshTokens.filter(token => token !== req.body.token)
  res.sendStatus(204)
})

// GET
// get all child
app.get('/childs', authenticateToken(0), (req, res) => {
  const { limit, offset, filter, search } = req.query

  let query = `SELECT * FROM child WHERE soft_delete = 0 ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`

  // get all filter
  if (filter === 'male') {
    query = `SELECT * FROM child WHERE soft_delete = 0 AND sex = 'M' ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'female') {
    query = `SELECT * FROM child WHERE soft_delete = 0 AND sex = 'F' ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'age') {
    query = `SELECT *, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), bdate)), '%Y') + 0 AS age 
    FROM child WHERE soft_delete = 0 ORDER BY age ASC LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'deleted') {
    query = `SELECT * FROM child WHERE soft_delete = 1 ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'underweight') {
    query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Underweight' GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'normal') {
    query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Normal' GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'overweight') {
    query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Overweight' GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
  }
  else if (filter === 'obese') {
    query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Obese' GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
  }

  // if search has value
  if (search) {
    query = `SELECT * FROM child WHERE 
      soft_delete = 0 AND id LIKE "${search}"
      OR soft_delete = 0 AND fname LIKE "%${search}%"
      OR soft_delete = 0 AND lname LIKE"%${search}%" LIMIT ${limit} OFFSET ${offset}`

    if (filter === 'male') {
      query = `SELECT * FROM child WHERE 
        soft_delete = 0 AND sex = 'M' AND id LIKE "${search}"
        OR soft_delete = 0 AND sex = 'M' AND fname LIKE "%${search}%"
        OR soft_delete = 0 AND sex = 'M' AND lname LIKE"%${search}%" LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'female') {
      query = `SELECT * FROM child WHERE 
        soft_delete = 0 AND sex = 'F' AND id LIKE "${search}"
        OR soft_delete = 0 AND sex = 'F' AND fname LIKE "%${search}%"
        OR soft_delete = 0 AND sex = 'F' AND lname LIKE"%${search}%" LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'age') {
      query = `SELECT * FROM
        (SELECT *, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), bdate)), '%Y') + 0 AS age 
        FROM child WHERE soft_delete = 0) AS result WHERE age = "${search}" ORDER BY age LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'deleted') {
      query = `SELECT * FROM child WHERE 
      soft_delete = 1 AND id LIKE "${search}"
      OR soft_delete = 1 AND fname LIKE "%${search}%"
      OR soft_delete = 1 AND lname LIKE"%${search}%" LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'underweight') {
      query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Underweight' AND child.id LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Underweight' AND child.fname LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Underweight' AND child.lname LIKE "%${search}%"
      GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'normal') {
      query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Normal' AND child.id LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Normal' AND child.fname LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Normal' AND child.lname LIKE "%${search}%"
      GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'overweight') {
      query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Overweight' AND child.id LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Overweight' AND child.fname LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Overweight' AND child.lname LIKE "%${search}%"
      GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
    }
    else if (filter === 'obese') {
      query = `SELECT
      child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age, child.image, child.id
      FROM child 
      LEFT OUTER JOIN record ON record.id = child.id
      INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
      WHERE child.soft_delete = 0 AND remark = 'Obese' AND child.id LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Obese' AND child.fname LIKE "%${search}%"
      OR child.soft_delete = 0 AND remark = 'Obese' AND child.lname LIKE "%${search}%"
      GROUP BY child.id ORDER BY child.lname LIMIT ${limit} OFFSET ${offset}`
    }
  }

  connection.query(query, (err, rows, fields) => {
    if (rows.length) {
      res.json(rows)
    }
    else {
      res.json({ "message": "No Child(s) Found", "id": "" })
    }
  })
});
// get specific child
app.get('/child/profile/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params

  connection.query(`SELECT *, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), bdate)), '%Y') + 0 AS age
      FROM child WHERE id=${req.params.id}`, (err, rows, fields) => {
    if (err) throw err
    else if (!rows[0]) {
      res.send(`No child with id: ${id}`)
    }

    res.json(rows[0])
  })
});
// search child fname and lname
// app.get('/child/duplicate/', (req, res) => {
//   const { fname, lname } = req.query

//   connection.query(`SELECT * FROM child WHERE fname = "${fname}"
//     AND lname = "${lname}"`, (err, rows, fields) => {
//     if (rows.length) {
//       res.json(rows)
//     }
//     else {
//       res.json({ "message": "1" })
//     }
//   })
// });
// get record
app.get('/records/:id', authenticateToken(0), (req, res) => {
  const { limit, offset, filter } = req.query

  let query

  if (limit == 5) {
    query = `SELECT * FROM record WHERE id=${req.params.id} AND record.soft_delete = 0 ORDER BY record_id ASC LIMIT ${limit} OFFSET ${offset}`
    // query = `SELECT * FROM record WHERE id=${req.params.id} ORDER BY record_id ASC LIMIT ${limit} OFFSET ${offset}`
  }
  else if (limit == 10) {
    query = `SELECT * FROM record 
      JOIN user ON user.user_id = record.user_id
      WHERE id=${req.params.id} AND record.soft_delete = 0 ORDER BY record_id DESC LIMIT ${limit} OFFSET ${offset}`

    // query = `SELECT * FROM record 
    // JOIN user ON user.user_id = record.user_id
    // WHERE id=${req.params.id} ORDER BY record_id DESC LIMIT ${limit} OFFSET ${offset}`

    if (filter === 'deleted') {
      query = `SELECT * FROM record WHERE id=${req.params.id} AND soft_delete = 1 ORDER BY record_id DESC LIMIT ${limit} OFFSET ${offset}`
    }
  }

  connection.query(query, (err, rows, fields) => {
    if (rows.length) {
      res.json(rows)
    }
    else {
      res.json({ "message": "No Record(s) Found", "bttn": 1 })
    }
  })
});
// get specific record
app.get('/record/:id', authenticateToken(0), (req, res) => {
  connection.query(`SELECT * FROM record WHERE record_id=${req.params.id}`, (err, rows, fields) => {
    if (err) throw err
    else if (!rows[0]) {
      res.send(`No record with id: ${id}`)
    }
    res.json(rows[0])
  })
});
// get all guardian
app.get('/guardians', authenticateToken(0), (req, res) => {
  const { limit, offset, search, filter } = req.query

  let query = `SELECT * FROM guardian WHERE soft_delete = 0 ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`

  if (filter === 'deleted') {
    query = `SELECT * FROM guardian WHERE soft_delete = 1 ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`
  }

  if (search) {
    query = `SELECT * FROM guardian WHERE 
      soft_delete = 0 AND guardian_id LIKE "${search}"
      OR soft_delete = 0 AND fname LIKE "%${search}%"
      OR soft_delete = 0 AND lname LIKE "%${search}%" 
      OR soft_delete = 0 AND household_id LIKE "%${search}%" LIMIT ${limit} OFFSET ${offset}`

    if (filter === 'deleted') {
      query = `SELECT * FROM guardian WHERE 
        soft_delete = 1 AND guardian_id LIKE "${search}"
        OR soft_delete = 1 AND fname LIKE "%${search}%"
        OR soft_delete = 1 AND lname LIKE "%${search}%" 
        OR soft_delete = 1 AND household_id LIKE "%${search}%" LIMIT ${limit} OFFSET ${offset}`
    }
  }

  connection.query(query, (err, rows, fields) => {
    if (rows.length) {
      res.json(rows)
    }
    else {
      res.json({ "message": "No Guardian(s) Found" })
    }
  })
});
// get specific guardian
app.get('/guardian/profile/:id', authenticateToken(0), (req, res) => {
  connection.query(`SELECT * FROM guardian WHERE guardian_id=${req.params.id}`, (err, rows, fields) => {
    if (err) throw err
    else if (!rows[0]) {
      res.send(`No guardian with id: ${id}`)
    }
    res.json(rows[0])
  })
});
// search guardian fname, lname and household_id
// app.get('/guardian/duplicate/name/hid/', (req, res) => {
//   const { fname, lname, household_id } = req.query

//   connection.query(`SELECT
//   (SELECT COUNT(*) FROM guardian WHERE fname = "${fname}" AND lname = "${lname}") AS nameResult,
//   (SELECT COUNT(*) FROM guardian WHERE household_id = "${household_id}") AS idResult`, (err, rows, fields) => {
//     if (rows.length) {
//       res.json(rows[0])
//     }
//   })
// });
// link get
app.get('/link/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params
  const { type } = req.query

  let query

  // get linked child to guardian
  if (type === 'child') {
    query = `SELECT guardian.fname, guardian.lname, guardian.address, guardian.purok, 
      guardian.contact, link.relationship, guardian.guardian_id
      FROM link JOIN guardian ON link.guardian_id = guardian.guardian_id
      WHERE link.id = ${id} AND guardian.soft_delete = 0`
  }
  // get linked guardian to child
  else if (type === 'guardian') {
    query = `SELECT *
      FROM link JOIN child ON link.id = child.id
      WHERE link.guardian_id = ${id} AND child.soft_delete = 0`
  }
  // get link details
  else if (type === 'link') {
    query = `SELECT * FROM link WHERE link_id = ${id}`
  }

  connection.query(query, (err, rows, fields) => {
    if (rows.length) {
      if (type === 'guardian') {
        res.json(rows)
      }
      else {
        res.json(rows[0])
      }
    }
    else {
      if (type === 'child') {
        res.json({ "message": "No Linked Guardian Yet" })
      }
      else if (type === 'guardian') {
        res.json({ "message": "No Linked Child Yet" })
      }
    }
  })
});
// get user
app.get('/users', authenticateToken(1), (req, res) => {
  const { limit, offset, search, filter } = req.query

  let query = `SELECT * FROM user WHERE soft_delete = 0 ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`

  if (filter === 'deleted') {
    query = `SELECT * FROM user WHERE soft_delete = 1 ORDER BY lname ASC LIMIT ${limit} OFFSET ${offset}`
  }

  if (search) {
    query = `SELECT * FROM user WHERE 
      soft_delete = 0 AND user_id LIKE "${search}"
      OR soft_delete = 0 AND username LIKE "${search}"
      OR soft_delete = 0 AND fname LIKE "%${search}%"
      OR soft_delete = 0 AND lname LIKE"%${search}%" GROUP BY user_id DESC LIMIT ${limit} OFFSET ${offset}`

    if (filter === 'deleted') {
      query = `SELECT * FROM user WHERE 
          soft_delete = 1 AND user_id LIKE "${search}"
          OR soft_delete = 1 AND username LIKE "${search}"
          OR soft_delete = 1 AND fname LIKE "%${search}%"
          OR soft_delete = 1 AND lname LIKE"%${search}%" GROUP BY user_id DESC LIMIT ${limit} OFFSET ${offset}`
    }
  }
  connection.query(query, (err, rows, fields) => {
    if (rows.length) {
      res.json(rows)
    }
    else {
      res.json({ "message": "No User(s) Found" })
    }
  })
});
// get announcement
app.get('/announcements', authenticateToken(0), (req, res) => {
  const { limit, offset, search, filter } = req.query

  let query = `SELECT announcement.title, announcement.content, announcement.annou_id, announcement.date, announcement.soft_delete,
    user.fname, user.lname
    FROM announcement 
    INNER JOIN user ON user.user_id = announcement.user_id
    WHERE announcement.soft_delete = 0 ORDER BY annou_id DESC LIMIT ${limit} OFFSET ${offset}`

  if (filter === 'deleted') {
    query = `SELECT announcement.title, announcement.content, announcement.annou_id, announcement.date, announcement.soft_delete,
    user.fname, user.lname 
    FROM announcement 
    INNER JOIN user ON user.user_id = announcement.user_id
    WHERE announcement.soft_delete = 1 ORDER BY annou_id DESC LIMIT ${limit} OFFSET ${offset}`
  }

  if (search) {
    query = `SELECT announcement.title, announcement.content, announcement.annou_id, announcement.date,  announcement.soft_delete,
      user.fname, user.lname 
      FROM announcement 
      INNER JOIN user ON user.user_id = announcement.user_id
      WHERE announcement.soft_delete = 0 AND announcement.title LIKE "%${search}%" 
      OR announcement.soft_delete = 0 AND user.fname LIKE "%${search}%" 
      OR announcement.soft_delete = 0 AND user.lname LIKE "%${search}%" 
      LIMIT ${limit} OFFSET ${offset}`

    if (filter === 'deleted') {
      query = `SELECT announcement.title, announcement.content, announcement.annou_id, announcement.date,  announcement.soft_delete,
        user.fname, user.lname 
        FROM announcement 
        INNER JOIN user ON user.user_id = announcement.user_id
        WHERE announcement.soft_delete = 1 AND announcement.title LIKE "%${search}%" 
        OR announcement.soft_delete = 1 AND user.fname LIKE "%${search}%" 
        OR announcement.soft_delete = 1 AND user.lname LIKE "%${search}%" 
        LIMIT ${limit} OFFSET ${offset}`
    }
  }

  connection.query(query, (err, rows, fields) => {
    if (rows.length) {
      res.json(rows)
    }
    else {
      res.json({ "message": "No Announcement(s) Found" })
    }
  })

});


// POST
// add new child
app.post('/child', authenticateToken(0), (req, res) => {
  let { fname, lname } = req.body
  const { bdate, sex, image } = req.body;

  fname = nameFormat(fname)
  lname = nameFormat(lname)

  connection.query(`INSERT INTO child (fname, lname, bdate, sex, image) 
        VALUES ('${fname}', '${lname}', '${bdate}', '${sex}', '${image}')`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// add new record
app.post('/record/:id', authenticateToken(0), (req, res) => {
  const { height, weight, user_id } = req.body;
  const { id } = req.params;
  let remark = bmi(height, weight)

  connection.query(`INSERT INTO record (id, height, weight, remark, output, user_id) 
        VALUES ('${id}','${height}', '${weight}', '${remark[0]}', '${remark[1]}', '${user_id}')`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// add new guardian
app.post('/guardian', authenticateToken(0), (req, res) => {
  let { fname, lname } = req.body
  const { contact, address, household_id } = req.body;

  fname = nameFormat(fname)
  lname = nameFormat(lname)

  connection.query(`SELECT guardian_id, household_id FROM guardian WHERE household_id = '${household_id}'`, (err, rows, fields) => {
    if (err) throw err
    if (rows[0]) {
      res.status(409).json({ message: "Household ID already been taken" })
    }
    else {
      connection.query(`INSERT INTO guardian (fname, lname, contact, address, household_id) 
            VALUES ('${fname}', '${lname}', '${contact}', '${address}', '${household_id}')`, (err, rows, fields) => {
        if (err) throw err
      })
      res.status(200).json({ message: "success" })
    }
  })
});
// add link to guardian & child
app.post('/link/add/:guardian_id', authenticateToken(0), (req, res) => {
  const { relationship, id } = req.body;
  const { guardian_id } = req.params;

  connection.query(`SELECT *
    FROM link JOIN child ON link.id = child.id
    WHERE link.id = ${id} AND child.soft_delete = 0`, (err, rows, fields) => {
    if (err) throw err
    else if (rows[0]) {
      res.status(409).json({ "message": "Child already been linked" })
    }
    else {
      connection.query(`INSERT INTO link (guardian_id, id, relationship) 
            VALUES ('${guardian_id}','${id}', '${relationship}')`, (err, rows, fields) => {
        if (err) throw err
      })
      res.send("success")
    }
  })

});
// get specific user
app.get('/user/profile/:id', authenticateToken(1), (req, res) => {
  connection.query(`SELECT user_id, fname, lname, username, soft_delete, contact, admin_power,
    CASE 
      WHEN admin_power = 1 THEN 'YES'
      ELSE "NO"
    END AS result
    FROM user WHERE user_id=${req.params.id}`, (err, row, fields) => {
    if (row) {
      res.json(row[0])
    }
    else {
      res.json({ "message": "User not found" })
    }
  })

});
// add user
app.post('/user', authenticateToken(1), (req, res) => {
  let { fname, lname } = req.body
  const { username, contact, admin_power, password } = req.body;

  fname = nameFormat(fname)
  lname = nameFormat(lname)

  connection.query(`SELECT
  (SELECT COUNT(*) FROM user WHERE username = "${username}") AS usernameResult`, (err, rows, fields) => {
    if (rows[0].usernameResult) {
      res.status(409).json("User's Username already been taken")
    }
    else {
      connection.query(`INSERT INTO user (fname, lname, username, contact, admin_power, password) 
        VALUES ('${fname}', '${lname}', '${username}', '${contact}', '${admin_power}', '${password}')`, (err, rows, fields) => {
        if (err) throw err
      })
      res.send("success")
    }
  })
});
// add new announcement
app.post('/announcement/new/:user_id', authenticateToken(1), (req, res) => {
  const { title, content } = req.body;
  const { user_id } = req.params

  connection.query(`INSERT INTO announcement (title, content, user_id) 
        VALUES ('${title}', '${content}', '${user_id}')`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});


// PUT
// update child
app.patch('/childUpdate/:id', authenticateToken(0), (req, res) => {
  let { fname, lname } = req.body
  const { id, bdate, sex, image } = req.body;

  fname = nameFormat(fname)
  lname = nameFormat(lname)

  connection.query(`UPDATE child SET fname = '${fname}', lname = '${lname}', bdate = '${bdate}', 
      sex ='${sex}', image='${image}' WHERE id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// update record
app.put('/record/:id', authenticateToken(0), (req, res) => {
  const { height, weight } = req.body;
  const { id } = req.params;
  let remark = bmi(height, weight)

  connection.query(`UPDATE record SET height = '${height}', weight = '${weight}', remark = '${remark[0]}', 
      output = '${remark[1]}' WHERE record_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// update guardian
app.put('/guardUpdate/:id', authenticateToken(0), (req, res) => {
  let { fname, lname } = req.body
  const { contact, address, household_id, purok } = req.body;
  const { id } = req.params

  fname = nameFormat(fname)
  lname = nameFormat(lname)

  connection.query(`SELECT guardian_id, household_id FROM guardian WHERE household_id = '${household_id}'`, (err, rows, fields) => {
    if (err) throw err
    if (rows[0] && rows[0].guardian_id != id && rows[0].household_id === household_id) {
      res.status(409).json({ message: "Household ID already been taken" })
    }
    else {
      connection.query(`UPDATE guardian SET fname = '${fname}', lname = '${lname}',
        contact = '${contact}', address = '${address}', household_id = '${household_id}', purok = '${purok}'
        WHERE guardian_id=${id}`, (err, rows, fields) => {
        if (err) throw err
      })
      res.status(200).json({ message: "success" })
    }
  })
});
// edit user
app.put('/user/edit/:id', authenticateToken(1), (req, res) => {
  let { fname, lname } = req.body
  const { user_id, contact, admin_power, username } = req.body;

  fname = nameFormat(fname)
  lname = nameFormat(lname)

  connection.query(`SELECT user_id, username FROM user WHERE username = "${username}"`, (err, rows, fields) => {
    if (rows[0] && rows[0].user_id != user_id && rows[0].username === username) {
      res.status(409).json("User's Username already been taken")
    }
    else {
      connection.query(`UPDATE user SET fname = '${fname}', lname = '${lname}',
          contact = '${contact}', admin_power = '${admin_power}', username = '${username}'
          WHERE user_id=${user_id}`, (err, rows, fields) => {
        if (err) throw err
      })
      res.send("success")
    }
  })
});
// edit user password
app.put('/user/edit/password/:id', authenticateToken(1), (req, res) => {
  const { id } = req.params
  const { password } = req.body;

  connection.query(`UPDATE user SET password = '${password}' WHERE user_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// edit announcement
app.put('/announcement/edit/:annou_id', authenticateToken(1), (req, res) => {
  const { annou_id } = req.params
  const { title, content } = req.body;

  connection.query(`UPDATE announcement SET title = '${title}', content = '${content}'
      WHERE annou_id=${annou_id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// edit link
app.put('/link/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params
  const { relationship } = req.body;

  connection.query(`UPDATE link SET relationship = '${relationship}' WHERE link_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});


// UNDO
// undo child
app.put('/child/ret/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE child SET soft_delete='0' WHERE id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})
// undo record
app.put('/record/ret/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE record SET soft_delete='0' WHERE record_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})
// undo guardian
app.put('/guardian/ret/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE guardian SET soft_delete='0' WHERE guardian_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})
// undo user
app.put('/user/ret/:id', authenticateToken(1), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE user SET soft_delete='0' WHERE user_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})
// undo announcement
app.put('/announcement/ret/:id', authenticateToken(1), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE announcement SET soft_delete='0' WHERE annou_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})

// SOFT DELETE
// soft delete child
app.put('/child/del/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE child SET soft_delete='1'  WHERE id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})
// soft delete guardian
app.put('/guardianDel/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE guardian SET soft_delete='1'  WHERE guardian_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// soft delete record
app.put('/record/del/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`UPDATE record SET soft_delete='1'  WHERE record_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// soft delete link
app.put('/link/del/:guardian_id', authenticateToken(0), (req, res) => {
  const { guardian_id } = req.params;

  connection.query(`UPDATE link SET soft_delete='1'  WHERE guardian_id=${guardian_id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// soft delete user
app.put('/user/del/:user_id', authenticateToken(1), (req, res) => {
  const { user_id } = req.params;

  if (user_id == '1') {
    res.json({ "message": "Staff cannot be deleted" })
  }
  else {
    connection.query(`UPDATE user SET soft_delete = '1', refresh_token = '' WHERE user_id=${user_id}`, (err, rows, fields) => {
      if (err) throw err
    })
    res.send("success")
  }
});
// soft delete announcement
app.put('/announcement/del/:annou_id', authenticateToken(1), (req, res) => {
  const { annou_id } = req.params;

  connection.query(`UPDATE announcement SET soft_delete='1'  WHERE annou_id=${annou_id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
})

// dashboard stuff
// get total child
app.get('/child/count/', (req, res) => {
  connection.query(`SELECT COUNT(id) FROM child WHERE soft_delete = 0`, (err, count, fields) => {
    if (err) throw err
    res.json(count[0]["COUNT(id)"])
  })
});
// get child latest record
app.get('/child/newRecord/:id', (req, res) => {
  const { id } = req.params;

  // connection.query(`SELECT height, weight, remark, output FROM record WHERE id = ${id} AND soft_delete = 0  ORDER BY record_id DESC LIMIT 1`, (err, row, fields) => {
  connection.query(`SELECT height, weight, remark, output FROM record WHERE id = ${id} AND soft_delete = 0 ORDER BY record_id DESC LIMIT 1`, (err, row, fields) => {
    if (row.length) {
      res.json(row[0])
    }
    else {
      res.json({ "message": "No Recent Record yet", "remark": "" })
    }
  })
});
// BMI remarks
app.get('/child/remarks', (req, res) => {
  let results = {
    "Underweight": 0,
    "Normal": 0,
    "Overweight": 0,
    "Obese": 0,
    "Underweight_Percentage": 0,
    "Normal_Percentage": 0,
    "Overweight_Percentage": 0,
    "Obese_Percentage": 0,
    "total": 0
  }

  connection.query(`SELECT
    child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age,
    record.height, record.weight, record.output, record.remark, record.date, record.record_id
    FROM child 
    LEFT OUTER JOIN record ON record.id = child.id
    INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record WHERE soft_delete = 0 GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
    WHERE child.soft_delete = 0 GROUP BY child.id`, (err, rows, fields) => {
    if (rows) {
      rows.forEach(item => { 
        results[item.remark] += 1
        results["total"]++
      })

      results["Underweight_Percentage"] = ((results["Underweight"]/results["total"])*100).toFixed(2);
      results["Normal_Percentage"] = ((results["Normal"]/results["total"])*100).toFixed(2)
      results["Overweight_Percentage"] = ((results["Overweight"]/results["total"])*100).toFixed(2)
      results["Obese_Percentage"] = ((results["Obese"]/results["total"])*100).toFixed(2)

      res.json(results)
    }
    else {
      res.json({ "message": "No result(s)" })
    }
  })
});
app.get('/child/data', async (req, res) => {
  const writeXlsxFile = require('write-excel-file/node')

  let CHILD_LIST, CHILD_LATEST_RECORDS
  const CHILD_LIST_COLUMNS = [
    {}, {}, {}, {}, {}, {}, {},
  ]
  const CHILD_LATEST_RECORDS_COLUMNS = [
    { width: 10 }, { width: 10 }, {}, {}, {}, { width: 10 }, {},
    { width: 20 }, { width: 10 }, { width: 10 } // date
  ]

  connection.query(`SELECT
    child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age,
    guardian.fname AS guard_fname, guardian.lname AS guard_lname, guardian.household_id,
    link.relationship
    FROM child 
    LEFT OUTER JOIN link ON link.id = child.id 
    LEFT OUTER JOIN guardian ON guardian.guardian_id = link.guardian_id
    WHERE child.soft_delete = 0 ORDER BY child.lname`, (err, rows, fields) => {
    if (rows) {
      const HEADER_ROW = [
        { value: 'First Name', fontWeight: 'bold' },
        { value: 'Last Name', fontWeight: 'bold' },
        { value: 'Age', fontWeight: 'bold' },
        { value: 'Guardian First Name', fontWeight: 'bold' },
        { value: 'Guardian Last Name', fontWeight: 'bold' },
        { value: 'Guardian Household ID', fontWeight: 'bold' },
        { value: 'Relationship', fontWeight: 'bold' }
      ]

      let DATA_ROWS = []

      rows.forEach(row => {
        DATA_ROWS.push([
          { type: String, value: row.fname },
          { type: String, value: row.lname },
          { type: Number, value: row.age },
          { type: String, value: row.guard_fname },
          { type: String, value: row.guard_lname },
          { type: String, value: row.household_id },
          { type: String, value: row.relationship }
        ])
      })

      CHILD_LIST = [HEADER_ROW, ...DATA_ROWS]
    }
  })

  connection.query(`SELECT
    child.fname, child.lname, DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), child.bdate)), '%Y') + 0 AS age,
    record.height, record.weight, record.output, record.remark, record.date, record.record_id,
    user.fname AS user_fname, user.lname AS user_lname
    FROM child 
    LEFT OUTER JOIN record ON record.id = child.id
    INNER JOIN (SELECT MAX(date) AS maxdate, id FROM record WHERE soft_delete = 0 GROUP BY id) r1 ON record.id = r1.id AND record.date = r1.maxdate
    INNER JOIN user ON user.user_id = record.user_id
    WHERE child.soft_delete = 0 GROUP BY child.id ORDER BY child.lname`, async (err, rows, fields) => {
    if (rows) {
      const HEADER_ROW = [
        { value: 'First Name', fontWeight: 'bold' },
        { value: 'Last Name', fontWeight: 'bold' },
        { value: 'Age', fontWeight: 'bold' },
        { value: 'Height', fontWeight: 'bold' },
        { value: 'Weight', fontWeight: 'bold' },
        { value: 'Remark', fontWeight: 'bold' },
        { value: 'Output', fontWeight: 'bold' },
        { value: 'Date', fontWeight: 'bold' },
        { value: 'User First Name', fontWeight: 'bold' },
        { value: 'User Last Name', fontWeight: 'bold' },
      ]

      let DATA_ROWS = []

      rows.forEach(row => {
        // console.log(row.date.toUTCString())

        DATA_ROWS.push([
          { type: String, value: row.fname },
          { type: String, value: row.lname },
          { type: Number, value: row.age },
          { type: Number, value: Number(row.height.toFixed(2)) },
          { type: Number, value: Number(row.weight.toFixed(2)) },
          { type: String, value: row.remark },
          { type: Number, value: Number(row.output.toFixed(2)) },
          { type: String, value: moment(row.date).format('MMM DD, YYYY hh:mm A') },
          { type: String, value: row.user_fname },
          { type: String, value: row.user_lname },
        ])
      })

      CHILD_LATEST_RECORDS = [HEADER_ROW, ...DATA_ROWS]
    }
  })

  // await writeXlsxFile([CHILD_LIST, CHILD_LATEST_RECORDS], {
  //   // columns: [CHILD_LIST_COLUMNS, CHILD_LATEST_RECORDS_COLUMNS],
  //   filePath: 'bocfp.xlsx',
  //   sheets: ['Child Lists', 'Child Latest Records'],
  // })

  setTimeout(async () => {
    await writeXlsxFile([CHILD_LIST, CHILD_LATEST_RECORDS], {
      columns: [CHILD_LIST_COLUMNS, CHILD_LATEST_RECORDS_COLUMNS],
      filePath: 'report/bocfp.xlsx',
      sheets: ['Child Lists', 'Child Latest Records'],
    })


    res.download('report/bocfp.xlsx')
  }, 1000)
});

// HARD DELETE
// delete link
app.delete('/link/:id', authenticateToken(0), (req, res) => {
  const { id } = req.params;

  connection.query(`DELETE FROM link WHERE link_id=${id}`, (err, rows, fields) => {
    if (err) throw err
  })
  res.send("success")
});
// delete child
// app.delete('/child/:id', (req, res) => {
//   const { id } = req.params;

//   connection.query(`DELETE FROM child WHERE id='${id}'`, (err, rows, fields) => {
//     if (err) throw err
//   })
//   res.send("success")
// });
// delete record
// app.delete('/record/del/:id', (req, res) => {
//   const { id } = req.params;

//   connection.query(`DELETE FROM record WHERE record_id='${id}'`, (err, rows, fields) => {
//     if (err) throw err
//   })
//   res.send("success")
// });

//

// const httpsServer = https.createServer({
//   key: fs.readFileSync('/etc/letsencrypt/live/bocfp.com/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/bocfp.com/fullchain.pem')
// }, app)

const start = async () => {
  try {
    // httpsServer.listen(port, () =>
    //   console.log(`Server is listening on port ${port}...`)
    // );
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
