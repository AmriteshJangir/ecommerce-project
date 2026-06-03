pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

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
                sh 'node -v'
                sh 'npm -v'
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
}
