const { createClient } = require('@libsql/client');

const db = createClient({
    url: process.env.TURSO_URL || 'libsql://moly-db-k8wi.aws-ap-south-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI1NzEwNjgsImlkIjoiMDE5Y2I1NzctYzAwMS03ZGIxLWEzMWQtZGRiZDI4YmFlYzA0IiwicmlkIjoiOTE0ODc2MmQtNzViMS00ZTZkLWFiOTAtN2Q3MmM3NmM4NTA5In0.ZdugY_afSaHkgcSLu8O3W-wVi1LvF1ocPHgx3GtD1cNCr05Mfm0jLQFayL7IEpDP1kjcn9H1gZQQ72tJb1oAAA'
});

async function renameBoard() {
    try {
        await db.execute("UPDATE boards SET name = 'APP' WHERE id = 1");
        console.log("Successfully renamed board 1 to 'APP'");
        process.exit(0);
    } catch (err) {
        console.error("Error renaming board:", err);
        process.exit(1);
    }
}

renameBoard();
