function saveOptions() {
	const token = $("#github-token").val();
	const orgName = $("#organization-name").val();

	chrome.storage.sync.set(
		{
			githubToken: token,
			organizationName: orgName
		},
		function() {
			$('.save-button').text("Saved!");
			let timo = setTimeout(() => {
				clearTimeout(timo);
				$('.save-button').text("Save Settings");
			}, 3000);
		}
	);
}

function loadOptions() {
	chrome.storage.sync.get(
		{
			githubToken: '',
			organizationName: ''
		},
		function(items) {
			$("#github-token").val(items.githubToken);
			$("#organization-name").val(items.organizationName);
		}
	);
}

$(() => {
	loadOptions();
});

$(".save-button").on('click', () => {
	saveOptions();
})