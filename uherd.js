var clientId = '270879350971-7k5qv54a09ip2k6cfsd5fpaksecuk4rl.apps.googleusercontent.com';

var apiKey = 'AIzaSyCSxH_RPgku5PeahJo5LWuujGgmh-kplKo';

var scopes = 'https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

function handleClientLoad() {
    // Step 2: Reference the API key
    gapi.client.setApiKey(apiKey);
    window.setTimeout(checkAuth, 1);
}

function checkAuth() {
    gapi.auth.authorize({
        client_id: clientId,
        scope: scopes,
        immediate: true
    }, handleAuthResult);
}

function handleAuthResult(authResult) {
    var authorizeButton = document.getElementById('authorize-button');
    if (authResult && !authResult.error) {
        authorizeButton.style.visibility = 'hidden';
        setupGooglePlusApi();
        setupGmailApi()
    } else {
        authorizeButton.style.visibility = '';
        authorizeButton.onclick = handleAuthClick;
    }
}

function handleAuthClick(event) {
    // Step 3: get authorization to use private data
    gapi.auth.authorize({
        client_id: clientId,
        scope: scopes,
        immediate: false
    }, handleAuthResult);
    return false;
}

// Load the API and make an API call.  Display the results on the screen.

function setupGooglePlusApi() {
    // Step 4: Load the Google+ API
    gapi.client.load('plus', 'v1').then(function() {
        // Step 5: Assemble the API request
        var request = gapi.client.plus.people.get({
            'userId': 'me'
        });
        // Step 6: Execute the API request
        request.then(function(resp) {
            console.log('Executing');
            var heading = document.createElement('h4');
            var image = document.createElement('img');
            image.src = resp.result.image.url;
            heading.appendChild(image);
            heading.appendChild(document.createTextNode(resp.result.displayName));
            userDisplayName = resp.result.displayName;

            document.getElementById('content').appendChild(heading);
        }, function(reason) {
            console.log('Error: ' + reason.result.error.message);
        });
    });
}

/**
 * Load Gmail API client library. List labels once client library
 * is loaded.
 */

function setupGmailApi() {
    gapi.client.load('gmail', 'v1', setupGmailFunctions);
}

function setupGmailFunctions() {
    document.getElementById("submit-button").onclick = submitEmail;
    listThreads();
}

function getThreadSubjectAndCount(thread) {
    if (thread.messages.length < 1)
        return 'zero-thread'
    var headers = thread.messages[0].payload.headers;
    for (i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.name == 'Subject') {
            return {
                'subject': header.value,
                'count': thread.messages.length
            };
        }
    }
    return 'unknown'
}

/**
 * Print all threads with the keywords, or nothing at all
 *
 */

function listThreads() {
    var userId = 'me';
    var query = 'uHerd';
    var maxResults = '15';

    var request = gapi.client.gmail.users.threads.list({
        'userId': userId,
        'maxResults': maxResults,
        'q': query
    });

    request.then(function(resp) {
        var threads = resp.result.threads;
        var batch = gapi.client.newBatch();
        for (var i = 0; i < threads.length; i++) {
            var thread = threads[i];
            var request2 = gapi.client.gmail.users.threads.get({
                'userId': userId,
                'id': thread.id
            });
            batch.add(request2);
            request2.then(function(thread) {
                return function(resp2) {
                    appendThread(getThreadSubjectAndCount(resp2.result));
                    //appendPre(thread.snippet);
                };
            }(thread));
        }
        batch.then();
    });
}

/**
 * Append a pre element to the body containing the given message
 * as its text node.
 *
 * @param {string} message Text to be placed in pre element.
 */

function appendThread(subjectAndCount) {
    var threadsList = document.getElementById('threads');

    var listElement = document.createElement("li");
    listElement.setAttribute("class", "list-group-item");

    var badgeElement = document.createElement("span");
    badgeElement.setAttribute("class", "badge");
    badgeElement.appendChild(document.createTextNode(subjectAndCount.count));
    listElement.appendChild(badgeElement);

    var textContent = document.createTextNode(subjectAndCount.subject + '\n');
    listElement.appendChild(textContent);

    threadsList.appendChild(listElement)
}

function submitEmail() {
    var recipients = document.getElementById("invitees").value;
    if (recipients == "") {
        alert("You need to pick invitees first!");
        return;
    }

    var dateTime = document.getElementById("uHerdDateTime").value;
    if (dateTime == "") {
        alert("You need to propose a date & time first!")
        return;
    }

    var subject = userDisplayName + " wants to invite you to an event!";

    var email = "To: " + recipients + "\n";
    email += "Subject: " + subject + "\n";
    email += "\n" + dateTime + "\n";

    var base64EncodedEmail = btoa(email);
    var request = gapi.client.gmail.users.messages.send({
        'userId': 'me',
        'resource': {
            'raw': base64EncodedEmail
        }
    });

    request.then(function() {
            alert("email sent!")
        },
        function() {
            alert("email failed to send!")
        });
}

$(function () {
    $('#datetimepicker1').datetimepicker();

    var planets = [ "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune" ];
    var planets = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: planets
    });

    $('#invitees').typeahead(
        {
          hint: true,
          highlight: true,
          minLength: 1
        },
        {
          name: 'planets',
          source: planets
        }
    );
});
