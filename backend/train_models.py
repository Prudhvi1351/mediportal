import os
import joblib
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
import xgboost as xgb
from sklearn.metrics import accuracy_score

def train():
    print("Loading dataset...")
    data = load_breast_cancer()
    X, y = data.data, data.target
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    os.makedirs('models', exist_ok=True)

    print("Training Logistic Regression...")
    lr = LogisticRegression(max_iter=10000)
    lr.fit(X_train, y_train)
    joblib.dump(lr, 'models/lr.pkl')

    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    joblib.dump(rf, 'models/rf.pkl')

    print("Training XGBoost...")
    xg = xgb.XGBClassifier()
    xg.fit(X_train, y_train)
    joblib.dump(xg, 'models/xgb.pkl')

    print("Training MLP...")
    mlp = MLPClassifier(max_iter=1000, random_state=42)
    mlp.fit(X_train, y_train)
    joblib.dump(mlp, 'models/mlp.pkl')

    print("Training completed.")
    print("Accuracy scores:")
    print("LR: ", accuracy_score(y_test, lr.predict(X_test)))
    print("RF: ", accuracy_score(y_test, rf.predict(X_test)))
    print("XGB: ", accuracy_score(y_test, xg.predict(X_test)))
    print("MLP: ", accuracy_score(y_test, mlp.predict(X_test)))

if __name__ == '__main__':
    train()
