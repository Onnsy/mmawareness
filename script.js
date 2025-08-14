var accessToken;
        var framedImageBlob;

        // Initialize Facebook SDK
        window.fbAsyncInit = function() {
            FB.init({
                appId: '347408025324115', // Your provided App ID
                status: true,
                cookie: true,
                oauth: true,
                xfbml: true,
                version: 'v23.0' // Latest Graph API version
            });

            // Check login status
            checkLoginStatus();
        };

        // Function to check login status and handle login
        function checkLoginStatus(callback) {
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    accessToken = response.authResponse.accessToken;
                    console.log('User is logged in with access token:', accessToken);
                    checkTokenPermissions(callback);
                } else {
                    FB.login(function(response) {
                        if (response.status === 'connected') {
                            accessToken = response.authResponse.accessToken;
                            console.log('User logged in successfully');
                            checkTokenPermissions(callback);
                        } else {
                            alert('Login failed or was canceled. Please log in to continue.');
                        }
                    }, { scope: 'user_photos', auth_type: 'reauthenticate' });
                }
            });
        }

        // Function to check token permissions
        function checkTokenPermissions(callback) {
            FB.api('/me/permissions', 'GET', { access_token: accessToken }, function(response) {
                if (response && !response.error) {
                    const permissions = response.data;
                    const hasUserPhotos = permissions.some(perm => perm.permission === 'user_photos' && perm.status === 'granted');
                    if (hasUserPhotos) {
                        console.log('user_photos permission granted');
                        if (callback) callback();
                    } else {
                        alert('The user_photos permission is required. Please grant this permission.');
                        FB.login(function(response) {
                            if (response.status === 'connected') {
                                accessToken = response.authResponse.accessToken;
                                console.log('User re-authenticated successfully');
                                if (callback) callback();
                            } else {
                                alert('Failed to grant user_photos permission.');
                            }
                        }, { scope: 'user_photos', auth_type: 'reauthenticate' });
                    }
                } else {
                    alert('Error checking permissions: ' + JSON.stringify(response.error));
                }
            });
        }

        // Preview image with frame
        function previewImage() {
            const input = document.getElementById('photo-input');
            const canvas = document.getElementById('preview-canvas');
            const ctx = canvas.getContext('2d');

            if (!input.files || !input.files[0]) {
                alert('Please select an image.');
                return;
            }

            const file = input.files[0];
            if (!file.type.match('image/jpeg|image/png')) {
                alert('Please select a JPEG or PNG image.');
                return;
            }

            const userImage = new Image();
            const frameImage = new Image();
            frameImage.src = 'frame.png'; // Replace with your frame image URL

            userImage.onload = function() {
                const maxSize = 1024;
                let width = userImage.width;
                let height = userImage.height;
                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(userImage, 0, 0, width, height);

                frameImage.onload = function() {
                    ctx.drawImage(frameImage, 0, 0, width, height);
                    canvas.toBlob(function(blob) {
                        if (!blob || blob.size === 0) {
                            alert('Failed to create image Blob. Please try again.');
                            return;
                        }
                        framedImageBlob = blob;
                        console.log('Blob created successfully, size:', blob.size / 1024, 'KB');
                    }, 'image/jpeg', 0.9);
                };
                frameImage.onerror = function() {
                    alert('Failed to load frame image. Check the frame URL.');
                };
            };
            userImage.onerror = function() {
                alert('Failed to load user image. Please select a valid image.');
            };
            userImage.src = URL.createObjectURL(file);
        }

        // Upload framed image to Facebook
        function uploadToFacebook() {
            if (!framedImageBlob) {
                alert('Please select and preview an image first.');
                return;
            }

            if (framedImageBlob.size === 0) {
                alert('The image Blob is empty. Please try selecting a new image.');
                return;
            }

            if (framedImageBlob.size > 8 * 1024 * 1024) {
                alert('Image is too large. Please select an image under 8MB.');
                return;
            }

            checkLoginStatus(function() {
                FB.api('/me/albums', 'GET', { access_token: accessToken }, function(response) {
                    if (response && !response.error) {
                        var album = response.data.find(album => album.name === 'Profile Pictures') || response.data[0];
                        if (!album) {
                            alert('No suitable album found. Creating a new album...');
                            createAlbumAndUpload();
                            return;
                        }
                        var albumId = album.id;
                        uploadPhoto(albumId, framedImageBlob, 'framed_image.jpg');
                    } else {
                        alert('Error fetching albums: ' + JSON.stringify(response.error));
                    }
                });
            });
        }

        // Upload original file (no frame) for testing
        function uploadOriginalFile() {
            const input = document.getElementById('photo-input');
            if (!input.files || !input.files[0]) {
                alert('Please select an image before uploading.');
                return;
            }

            const file = input.files[0];
            if (!file.type.match('image/jpeg|image/png')) {
                alert('Please select a JPEG or PNG image.');
                return;
            }

            if (file.size > 8 * 1024 * 1024) {
                alert('Image is too large. Please select an image under 8MB.');
                return;
            }

            console.log('Selected file:', file.name, 'size:', file.size / 1024, 'KB', 'type:', file.type);

            checkLoginStatus(function() {
                FB.api('/me/albums', 'GET', { access_token: accessToken }, function(response) {
                    if (response && !response.error) {
                        var album = response.data.find(album => album.name === 'Profile Pictures') || response.data[0];
                        if (!album) {
                            alert('No suitable album found. Creating a new album...');
                            createAlbumAndUploadOriginal(file);
                            return;
                        }
                        var albumId = album.id;
                        uploadPhoto(albumId, file, 'original_image.jpg');
                    } else {
                        alert('Error fetching albums: ' + JSON.stringify(response.error));
                    }
                });
            });
        }

        // Create a new album if none exists
        function createAlbumAndUpload() {
            FB.api(
                '/me/albums',
                'POST',
                {
                    name: 'Profile Pictures',
                    access_token: accessToken
                },
                function(response) {
                    if (response && !response.error) {
                        var albumId = response.id;
                        uploadPhoto(albumId, framedImageBlob, 'framed_image.jpg');
                    } else {
                        alert('Error creating album: ' + JSON.stringify(response.error));
                    }
                }
            );
        }

        // Create a new album for original file upload
        function createAlbumAndUploadOriginal(file) {
            FB.api(
                '/me/albums',
                'POST',
                {
                    name: 'Profile Pictures',
                    access_token: accessToken
                },
                function(response) {
                    if (response && !response.error) {
                        var albumId = response.id;
                        uploadPhoto(albumId, file, 'original_image.jpg');
                    } else {
                        alert('Error creating album: ' + JSON.stringify(response.error));
                    }
                }
            );
        }

        // Upload photo using fetch
        function uploadPhoto(albumId, fileOrBlob, fileName) {
            if (!(fileOrBlob instanceof Blob)) {
                alert('Invalid file type. Please select a valid image.');
                return;
            }

            const formData = new FormData();
            formData.append('source', fileOrBlob, fileName);
            formData.append('access_token', accessToken);

            console.log('Uploading image:', fileName, 'size:', fileOrBlob.size / 1024, 'KB', 'type:', fileOrBlob.type);

            fetch(`https://graph.facebook.com/v20.0/${albumId}/photos`, {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error uploading photo: ' + JSON.stringify(data.error));
                    } else {
                        alert('Photo uploaded successfully to Profile Pictures album! Post ID: ' + data.id + '. Please set it as your profile picture manually on Facebook.');
                    }
                })
                .catch(error => {
                    alert('Network error during upload: ' + error.message);
                });
        }

        // Load the SDK asynchronously
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));