// User signup form
$('#signup').submit(e => {
  e.preventDefault()
  
  let email = $('#email').val()
  
  // Very good form validation
  if (!email) {
    return
  }
  
  let request = {
    url : '/users',
    type : 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      email: email
    })
  }
  
  $.ajax(request)
    .then(data => {
      // Redirect the user for OAUTH
      // You can skip the CIO splash screen by appending "&skip_oauth_splash=1" to this url
      window.location = data.browser_redirect_url
    })
})

// Webhook creation form
$('#webhook').submit(e => {
  e.preventDefault()
  
  let user = $('#user').val()
  let from = $('#from').val()
  
  // Very good form validation
  if (!user || !from) {
    return
  }
  
  let request = {
    url : '/webhook',
    type : 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      user: user,
      from: from
    })
  }
  
  $.post(request)
    .then(data => {
      // Refresh the UI
      $('#from').val('')
      GetData()
    })
})

// Get user data and populate lists
const GetData = () => {
  let request = {
    url: '/users',
    type: 'GET'
  }
  
  $.ajax(request)
    .then(data => {
      $('#user').empty()
      $('#webhooks').empty()
    
      if (data.length === 0) {
        $('#user').append('<option disabled>No Users yet :(</option>')
        $('#webhooks').append('<li>No Users yet :(</li>')
      }
    
      data.forEach(user => {
        let option = `<option value="${user.email}">${user.email}</option>`
        let item = `<li>${user.email} messages moved: ${user.messages_moved}</li>`

        $('#user').append(option)
        $('#webhooks').append(item)
      })
    })
}

// Fire it up!
GetData()

// Check for updates via polling
setInterval(GetData, 5000)