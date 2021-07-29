'use strict';
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamodbOfflineOptions = {
  region: "localhost",
  endpoint: "http://localhost:8000"
}

const isOffline = () => process.env.IS_OFFLINE;

const dynamoDb = isOffline()
  ? new AWS.DynamoDB.DocumentClient(dynamodbOfflineOptions)
  : new AWS.DynamoDB.DocumentClient();

const params = {
  TableName: process.env.PACIENTES_TABLE
};

module.exports.listarPacientes = async (event) => {
  try {
    const queryString = {
      limit: 5,
      ...event.queryStringParameters
    }

    const { limit, next } = queryString

    let localParams = {
      ...params,
      Limit: limit
    }

    if (next) {
      localParams.ExclusiveStartKey = {
        paciente_id: next
      }
    }

    let data = await dynamoDb.scan(localParams).promise();

    let nextToken = data.LastEvaluatedKey != undefined
      ? data.LastEvaluatedKey.paciente_id
      : null;

    const result = {
      items: data.Items,
      next_token: nextToken
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.log("Error", err)
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error",
      })
    }
  }
};

module.exports.obterPaciente = async (event) => {

  try {
    const { pacienteId } = event.pathParameters

    const data = await dynamoDb.get({ ...params, Key: { paciente_id: pacienteId } }).promise()

    console.log(data)

    if (data.Item == null) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Paciente não existe" }, null, 2),
      };
    }

    const paciente = data.Item

    return {
      statusCode: 200,
      body: JSON.stringify(paciente, null, 2),
    };
  } catch (err) {
    console.log("Error", err)
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error",
      })
    }
  }
};

module.exports.cadastrarPaciente = async (event) => {
  try {
    let dados = JSON.parse(event.body)

    const {
      nome,
      email,
      telefone,
      data_nascimento,
    } = dados

    const paciente = {
      paciente_id: uuidv4(),
      nome,
      email,
      telefone,
      data_nascimento,
      status: true,
      criado_em: new Date().getTime
    }

    await dynamoDb.put({
      ...params,
      Item: paciente,
    }).promise();

    return { statusCode: 201, }
  } catch (err) {
    console.log("Error", err)
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error",
      })
    }
  }
}

module.exports.atualizarPaciente = async (event) => {
  try {
    const { pacienteId } = event.pathParameters
    let dados = JSON.parse(event.body)

    const {
      nome,
      email,
      telefone,
      data_nascimento,
    } = dados

    await dynamoDb.update({
      ...params,
      Key: {
        paciente_id: pacienteId,
      },
      UpdateExpression:
        'SET nome = :nome, data_nascimento = :data_nascimento, email = :email, telefone = :telefone, atualizado_em = :atualizado_em',
      ConditionExpression: 'attribute_exists(paciente_id)',
      ExpressionAttributeValues: {
        ':nome': nome,
        ':data_nascimento': data_nascimento,
        ':email': email,
        ':telefone': telefone,
        ':atualizado_em': new Date().getTime.toString(),
      },
    }).promise();

    return { statusCode: 204, }

  } catch (err) {

    let error = err.name ? err.name : "Exception"
    let message = err.message ? err.message : "Unknown error"
    let statusCode = err.statusCode ? err.statusCode : 500

    if (error === 'ConditionalCheckFailedException') {
      error = 'Pacienre não existe'
      message = `Recurso com ID ${pacienteId} não existe e não pode ser atualizado`
      statusCode = 404
    }


    console.log("Error", err)
    return {
      statusCode,
      body: JSON.stringify({
        error,
        message,
      })
    }
  }
}
module.exports.excluirPaciente = async (event) => {
  try {
    const { pacienteId } = event.pathParameters

    await dynamoDb.delete({
      ...params,
      Key: {
        paciente_id: pacienteId,
      },
      ConditionExpression: 'attribute_exists(paciente_id)',
    }).promise();

    return { statusCode: 204, }

  } catch (err) {

    let error = err.name ? err.name : "Exception"
    let message = err.message ? err.message : "Unknown error"
    let statusCode = err.statusCode ? err.statusCode : 500

    if (error === 'ConditionalCheckFailedException') {
      error = 'Pacienre não existe'
      message = `Recurso com ID ${pacienteId} não existe e não pôde ser excluído`
      statusCode = 404
    }


    console.log("Error", err)
    return {
      statusCode,
      body: JSON.stringify({
        error,
        message,
      })
    }
  }
}