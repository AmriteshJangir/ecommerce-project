pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/AmriteshJangir/ecommerce-project.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                echo 'Build completed successfully'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                mkdir -p deploy
                cp -r * deploy/
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Build Failed'
        }
    }
}
