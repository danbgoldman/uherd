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

function getMessageHeader(message,label)
{
    var headers = message.payload.headers;
    var length = headers.length;
    for (i = 0; i < length; i++)
    {
        var header = headers[i];
        if (header.name == label)
            return header.value;
    }
    return null;
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
        if (resp.result.resultSizeEstimate == 0) return;
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
                    appendThread(resp2.result);
                };
            }(thread));
        }
        batch.then();
    },
    function(resp) {/* TODO no action on failure */});
}

/**
 * Append a pre element to the body containing the given message
 * as its text node.
 *
 * @param {string} message Text to be placed in pre element.
 */

function appendThread(thread) {
    var threadsList = document.getElementById('threads');

    var listElement = document.createElement("li");
    listElement.setAttribute("class", "list-group-item");

    var badgeElement = document.createElement("span");
    badgeElement.setAttribute("class", "badge");
    badgeElement.appendChild(document.createTextNode(thread.messages.length));
    listElement.appendChild(badgeElement);

    var textContent = document.createTextNode(getMessageHeader(thread.messages[0],'Subject') + '\n');
    listElement.appendChild(textContent);

    $(listElement).on("click",
            {thread: thread,
            listElement: listElement},
                function(event) {
                    listElement.setAttribute("class","list-group-item active");
                    makeChat(thread);
                }
            );
        
    threadsList.appendChild(listElement)
}

function extractChatData(message)
{
    result = {};
    result.text = atob(message.payload.body.data);
    result.author = getMessageHeader(message,"From");
    result.date = new Date(getMessageHeader(message,"Date"));
    result.isMe = ($.inArray("SENT",message.labels) != -1);
    return result;
}

function makeChat(thread) {

    // detach the chat list
    var chat = $("#chat");
    var chatList = chat.find("ul")
    var chatParent = chatList.parent();
    chatList.detach();
    
    // clear the chat list
    var prototypeEntry = chatList.find("li").detach().eq(0);

    // for each email
    $.each(thread.messages, function(idx, message) {
        // clone the prototype entry
        var entry = prototypeEntry.clone();

        // replace the icon, name, time, and contents
        var chatData = extractChatData(message);
        entry.find("p").text(chatData.text);
        entry.find("strong").text(chatData.author);
        var agoText = moment(chatData.date).fromNow();
        entry.find("span.time").text(agoText);
        
        // attach to the chat list
        entry.appendTo(chatList);
        
        // make it visible
        // TODO
    });
    
    // attach the chat list to the parent
    chatList.appendTo(chatParent);
    chat.removeClass("hidden");
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

    var subject = userDisplayName + " invited you to an event with uHerd!";

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
