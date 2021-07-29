# cadastro-pacientes
AWS Lambda + Serverless + DynamoDb

serverless create --template aws-nodejs --path cadastro-pacientes

serverless invoke local -f listarPacientes

serverless deploy

serverless logs -f obterpacientes --tail

serverless offline

npm i serverless-dynamodb-local --save-dev && serverless dynamodb install && serverless dynamodb install
