export const TEST_DID = 'did:plc:ewvi7nxzyoun6zhxrhs64oiz';
export const TEST_PDS = 'https://test.pds.example.com';

export const testDidDocument = {
	id: TEST_DID,
	alsoKnownAs: ['at://test.bsky.social'],
	service: [
		{
			id: '#atproto_pds',
			type: 'AtprotoPersonalDataServer',
			serviceEndpoint: TEST_PDS,
		},
	],
};

export const testResourceMetadata = {
	resource: TEST_PDS,
	authorization_servers: [TEST_PDS],
	bearer_methods_supported: ['header'],
	scopes_supported: ['atproto'],
};

export const testAuthorizationMetadata = {
	issuer: TEST_PDS,
	authorization_endpoint: `${TEST_PDS}/oauth/authorize`,
	token_endpoint: `${TEST_PDS}/oauth/token`,
	pushed_authorization_request_endpoint: `${TEST_PDS}/oauth/par`,
	revocation_endpoint: `${TEST_PDS}/oauth/revoke`,
	dpop_signing_alg_values_supported: ['ES256'],
	scopes_supported: ['atproto'],
	response_types_supported: ['code'],
	response_modes_supported: ['query'],
	grant_types_supported: ['authorization_code', 'refresh_token'],
	code_challenge_methods_supported: ['S256'],
	token_endpoint_auth_methods_supported: ['none'],
	authorization_response_iss_parameter_supported: true,
	require_pushed_authorization_requests: true,
	client_id_metadata_document_supported: true,
};
