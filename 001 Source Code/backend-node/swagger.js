// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');


const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FMDS API 문서',
      version: '1.0.0',
      description: '플러그인 기반 대시보드 시스템의 백엔드 API 명세서',
    },
    servers: [
      {
        url: 'https://port-0-fmds2-mgvyuurmef92981c.sel3.cloudtype.app', 
      },
    ],
  },
  apis: ['./server.js'], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };