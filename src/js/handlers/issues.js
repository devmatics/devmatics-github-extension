var initRun = false;
var token = '';
var orgName = '';
var userName = '';

// Timeout for search entry in modal to not hammer the api with every letter
var loadPageTimeout;
var searchEntryTimeout;

// Only run init once per load
if (!initRun) {
	initRun = true;

	let url = window.location.href;
	const urlArray = url.split('/');
	const currentRepo = urlArray[4];
	const repoOwner = urlArray[3];

	// only proceed if this is not a PR page or a new issue
	if (url.indexOf(`${repoOwner}/${currentRepo}/compare/`) < 0 &&
		url.indexOf(`${repoOwner}/${currentRepo}/pull/`) < 0 &&
		url.indexOf(`${repoOwner}/${currentRepo}/issues/new`) < 0)
	{
		// Give github a chance to load since its a SPA internall
		loadPageTimeout = setTimeout(() => {
			clearTimeout(loadPageTimeout);

			// if our content isn't already here
			if ($('.devmatics-issues-sidebar').length === 0)
			{
				loadSidebar();
			}
		}, 1000);
	}	
}

function loadSidebar() {
	$.get(chrome.runtime.getURL("templates/issues-sidebar.html"), (response) => {
		const sidebar = $(response);
		sidebar.insertBefore($('.sidebar-assignee'));

		
		$('.devmatics-sidebar-header').on('click', () => {
			chrome.runtime.sendMessage({'action': 'openOptionsPage'});
		});

		loadOptions();
	});
}

function loadOptions() {
	chrome.storage.sync.get({
		githubToken: '',
		organizationName: '',
	},
	(item) => {
		token = item.githubToken;
		orgName = item.organizationName;
		testToken();
	});
}

function testToken() {

	if (token === '') {

		noToken();

	}
	else {
		$.ajax({
			type: 'GET',
			beforeSend: (request) => {
				request.setRequestHeader('Authorization', `token ${token}`);
				request.setRequestHeader('Content-Type', 'application/json');
			},
			url: 'https://api.github.com/user'
		}).done((data, status, header) => {

			testTokenSucceeded(data);

		}).fail((header, status, errorInfo) => {

			badToken(header, errorInfo);

		}).always(() => {

			$('.devmatics-loading').hide();

		});
	}
}

function noToken()
{
	$('.devmatics-no-token-button').on('click', () => {
		chrome.runtime.sendMessage({'action': 'openOptionsPage'});
	});
	$('.devmatics-no-token').show();
	$('.devmatics-loading').hide();
}

function badToken(header, errorInfo)
{
	$('.devmatics-bad-token-button').on('click', () => {
		chrome.runtime.sendMessage({'action': 'openOptionsPage'});
	});
	if (header && header.responseJSON && header.responseJSON.message) {
		$('.devmatics-bad-token-details').text(header.responseJSON.message);
	}
	else if (errorInfo)
	{
		$('.devmatics-bad-token-details').text(errorInfo);
	}
	else if (header && header.status)
	{
		$('.devmatics-bad-token-details').text(header.status);
	}
	else
	{
		$('.devmatics-bad-token-details').text('Unknown Error');
	}
	$('.devmatics-bad-token').show();
}

function testTokenSucceeded(data)
{

	if (data && data.login) {
		userName = data.login;
		$('.devmatics-has-token-user').text(userName);
	}
	else {
		
		$('.devmatics-has-token-user').text("Unkown User! Are you sure this is working?");
	}

	if (orgName)
	{
		$('.devmatics-has-token-org-name').text(orgName);
		$('.devmatics-has-token-org').show();
		$('#use-org-name').prop('disabled', false);
		$('#use-org-name').prop('checked', true);
	}
	else
	{
		$('.devmatics-has-token-org').hide();
		$('#use-org-name').prop('disabled', true);
		$('#use-org-name').prop('checked', false);
		$('#only-this-owner').prop('checked', true);
	}

	$('.devmatics-has-token').show();
	$('.devmatics-create-linked-issue-open').on('click', () => {
		$('#createLinkedIssueDialog').get(0).showModal();
	});
	$('.devmatics-create-linked-issue-close').on('click', () => {
		$('#createLinkedIssueDialog').get(0).close();
	});

	$('#use-org-name').on('change', () => {
		if ($('#use-org-name').is(':checked'))
		{
			$('#only-this-owner').prop('checked', false);
		}
	});

	$('#only-this-owner').on('change', () => {
		if ($('#only-this-owner').is(':checked'))
		{
			$('#use-org-name').prop('checked', false);
		}
	});

	$('.devmatics-create-linked-issue-search').on('input', () => {
		clearTimeout(searchEntryTimeout);
		
		searchEntryTimeout = setTimeout(() => {

			clearTimeout(searchEntryTimeout);

			let searchText = $('.devmatics-create-linked-issue-search').val();
		
			if (!(searchText && searchText.length > 0))
			{
				return;
			}

			searchRepositories(searchText);

		},250);
	});

	let issueTitle = $('.js-issue-title').first().text();
	$('.devmatics-create-linked-issue-name').val(issueTitle);

	$(document).on('click', (event) => {
		if (event && 
			event.target && 
			event.target.classList && 
			event.target.classList.contains("devmatics-create-linked-issue-choice")) {

			let repoName = $(event.target).attr('data-repo');

			$('.devmatics-create-linked-issue-selected').text(repoName + ' ');
			$('.devmatics-create-linked-issue-menu').prop('open', false);
			$('.devmatics-create-linked-issue-button').attr('data-repo', repoName);
			$('.devmatics-create-linked-issue-button').prop('disabled', false);
		}
	});

	$('.devmatics-create-linked-issue-button').on("click", () => {
		$('.devmatics-create-linked-issue-button').prop('disabled', true);
		$('.devmatics-create-linked-issue-button').text('Creating Linked Issue...');
		let repoName = $('.devmatics-create-linked-issue-button').attr('data-repo');
		let issueTitle = $('.devmatics-create-linked-issue-name').val();

		createLinkedIssue(repoName, issueTitle);
	})
}

function searchRepositories(searchText)
{
	
	// maybe add more sanitization here in case the user wants to specify an org on the fly		
	if (orgName && 
		$('#use-org-name').is(":checked"))
	{
		searchText += ` org:${orgName}`;
	}
	else if ( userName &&
		$('#only-this-owner').is(":checked"))
	{
		searchText += ` user:${userName}`;
	}
	
	$.ajax({
		type: 'GET',
		beforeSend: (request) => {
			request.setRequestHeader('Authorization', `token ${token}`);
			request.setRequestHeader('Content-Type', 'application/json');
			request.setRequestHeader('Accept', 'application/vnd.github.v3+json');
		},
		url: 'https://api.github.com/search/repositories',
		data: {
			q: searchText,
			per_page: 10
		}
	}).done((data, status, header) => {
		if (!(data && data.items)) {
			$('.devmatics-create-linked-issue-repo-results').html('<p class=\"m-3\">Results!</p>');
			return;
		}
		else {
			$('.devmatics-create-linked-issue-repo-results').html('');
		}

		$.each(data.items, function() {
			let htmlItem, descriptionPart, repoPart;

			if (!this.full_name) {
				this.full_name = "Unknown Name!!!";
			}
			repoPart = `<h5>${this.full_name}</h5>`;
			

			if (this.description) {
				descriptionPart = `<p class=\"text-normal\">${this.description}</p>`;
			}
			else {
				descriptionPart = ` `;
			}

			htmlItem = `<button class=\"select-menu-item devmatics-create-linked-issue-choice\" data-repo=\"${this.full_name}\" tabindex=\"0\"><div class=\"select-menu-item-text\" style=\"pointer-events:none;\">${repoPart}${descriptionPart}</div></button>`;

			$('.devmatics-create-linked-issue-repo-results').append(htmlItem)
		})
	}).fail((header, status, errorInfo) => {
		let errorText = 'Unknown Error';

		if (header && header.responseJSON && header.responseJSON.message) {
			errorText = header.responseJSON.message;
		}
		else if (errorInfo) {
			errorText = errorInfo;
		}
		else if (header && header.status) {
			errorText = header.status;
		}


		$('.devmatics-create-linked-issue-repo-results').html(`<p class=\"m-3\">An error occured while searching: ${errorText}</p>`);
	});
}

function createLinkedIssue(repoName, issueTitle) {
	const jsonBody = {
		title: issueTitle,
		body: `Parent Issue: [${window.location.href}](${window.location.href}])`,
	};

	$.ajax({
		type: 'POST',
		beforeSend: (request) => {
			request.setRequestHeader('Authorization', `token ${token}`);
			request.setRequestHeader('Content-Type', 'application/json');
			request.setRequestHeader('Accept', 'application/vnd.github.v3+json');
			
		},
		url: `https://api.github.com/repos/${repoName}/issues`,
		data: JSON.stringify(jsonBody)
	}).done((data, status, header) => {

		if (data && data.html_url)
		{
			getCurrentIssue(data.html_url)
		}
		else
		{
			$('.devmatics-create-linked-issue-button').after(`<p>There was an error creating the linked issue: Empty but succesful response to create</p>`);
		}

	}).fail((header, status, errorInfo) => {

		let errorMessage = 'Unknown Error';

		if (header && header.responseJSON && header.responseJSON.message) {
			errorMessage = header.responseJSON.message;
		}
		else if (errorInfo) {
			errorMessage = errorInfo;
		}
		else if (header && header.status) {
			errorMessage = header.status;
		}

		$('.devmatics-create-linked-issue-button').after(`<p>There was an error creating the linked issue: ${errorMessage}</p>`);

	});
}

function getCurrentIssue(newIssueURL) {
	let pathPart = window.location.pathname;

	$.ajax({
		type: 'GET',
		beforeSend: (request) => {
			request.setRequestHeader('Authorization', `token ${token}`);
			request.setRequestHeader('Content-Type', 'application/json');
			request.setRequestHeader('Accept', 'application/vnd.github.v3+json');
			
		},
		url: `https://api.github.com/repos${pathPart}`,
	}).done((data, status, header) => {

		if (data && data.body)
		{
			editCurrentIssue(data.body, newIssueURL)
		}
		else
		{
			$('.devmatics-create-linked-issue-button').after(`<p>There was an error getting the current issue: Empty but succesful response to create</p>`);
		}

	}).fail((header, status, errorInfo) => {

		let errorMessage = 'Unknown Error';

		if (header && header.responseJSON && header.responseJSON.message) {
			errorMessage = header.responseJSON.message;
		}
		else if (errorInfo) {
			errorMessage = errorInfo;
		}
		else if (header && header.status) {
			errorMessage = header.status;
		}

		$('.devmatics-create-linked-issue-button').after(`<p>There was an error getting the current issue: ${errorMessage}</p>`);

	});
}

function editCurrentIssue(body, newIssueURL)
{
	let pathPart = window.location.pathname;
	body += `\r\n- [ ] ${newIssueURL}`;
	
	const jsonBody = {
		body: body
	};

	$.ajax({
		type: 'PATCH',
		beforeSend: (request) => {
			request.setRequestHeader('Authorization', `token ${token}`);
			request.setRequestHeader('Content-Type', 'application/json');
			request.setRequestHeader('Accept', 'application/vnd.github.v3+json');
		},
		url: `https://api.github.com/repos${pathPart}`,
		data: JSON.stringify(jsonBody)
	}).done((data, status, header) => {
		$('#createLinkedIssueDialog').get(0).close();
	}).fail((header, status, errorInfo) => {

		let errorMessage = 'Unknown Error';

		if (header && header.responseJSON && header.responseJSON.message) {
			errorMessage = header.responseJSON.message;
		}
		else if (errorInfo) {
			errorMessage = errorInfo;
		}
		else if (header && header.status) {
			errorMessage = header.status;
		}

		$('.devmatics-create-linked-issue-button').after(`<p>There was an error editting the current issue: ${errorMessage}</p>`);

	});
}

