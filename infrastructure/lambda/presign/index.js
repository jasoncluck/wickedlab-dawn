const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION });

const ALLOWED_ORIGINS = new Set([
  'https://wickedstickerz.com',
  'https://thewickedlab.com',
]);

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

function corsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath || '/';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  if (path.endsWith('/presign')) return handlePresign(event);
  if (path.endsWith('/view'))    return handleView(event);

  return { statusCode: 404, headers: corsHeaders(event), body: JSON.stringify({ error: 'Not found' }) };
};

async function handlePresign(event) {
  const cors = corsHeaders(event);
  const fileType = event.queryStringParameters?.fileType;

  if (!fileType || !ALLOWED_TYPES.has(fileType)) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: 'Invalid or missing fileType' }),
    };
  }

  const ext = fileType === 'image/jpeg' ? 'jpg'
    : fileType === 'image/heif' ? 'heic'
    : fileType.split('/')[1];

  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key, ContentType: fileType }),
    { expiresIn: 300 }
  );

  const viewUrl = `${process.env.API_BASE_URL}/view?key=${encodeURIComponent(key)}`;

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ uploadUrl, viewUrl }),
  };
}

async function handleView(event) {
  const key = event.queryStringParameters?.key;

  if (!key || !key.startsWith('uploads/')) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid key' }),
    };
  }

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key }),
    { expiresIn: 900 }
  );

  return { statusCode: 302, headers: { Location: signedUrl }, body: '' };
}
