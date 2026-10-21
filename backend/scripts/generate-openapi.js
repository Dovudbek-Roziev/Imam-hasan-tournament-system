const fs = require('node:fs');
const path = require('node:path');
const specification = require('../docs/openapi');

// RU: Сохранить переносимый OpenAPI JSON для Swagger Editor, Postman и ревью.
// EN: Save portable OpenAPI JSON for Swagger Editor, Postman, and review.
function generate() {
    fs.writeFileSync(path.join(__dirname, '../docs/openapi.json'), `${JSON.stringify(specification, null, 2)}\n`, 'utf8');
    console.log('Описание API сохранено: docs/openapi.json');
}

if (require.main === module) generate();
