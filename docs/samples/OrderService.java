/**
 * 注文管理サービスクラス
 * 注文の登録・検索・キャンセルを提供する
 */
package com.example.order;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 注文サービス
 */
public class OrderService {

    // --- static フィールド ---
    private static final int MAX_ORDER_AMOUNT = 1000000;

    // --- インスタンスフィールド ---
    private List<Order> orderList;
    private int sosakaisuu; // 規約違反(1): ローマ字変数名（操作回数）

    // --- コンストラクタ ---
    /**
     * コンストラクタ
     */
    public OrderService() {
        this.orderList = new ArrayList<>();
        this.sosakaisuu = 0;
    }

    // --- メソッド ---

    /**
     * 注文を登録する
     *
     * @param customerId 顧客ID
     * @param amount     注文金額
     * @return 登録した注文
     */
    public Order registerOrder(String customerId, int amount) {
        if (amount > MAX_ORDER_AMOUNT) {
            throw new IllegalArgumentException("注文金額が上限を超えています");
        }
        Order order = new Order(customerId, amount, LocalDateTime.now());
        orderList.add(order);
        sosakaisuu++;
        return order;
    }

    /**
     * 顧客IDで注文を検索する
     *
     * @param customerId 顧客ID
     * @return 該当する注文のリスト
     */
    public List<Order> findOrdersByCustomer(String customerId) {
        List<Order> result = new ArrayList<>();
        for (Order order : orderList) {
            if (order.getCustomerId().equals(customerId)) {
                result.add(order);
            }
        }
        return result;
    }

    /**
     * 注文をキャンセルする
     *
     * @param orderId 注文ID
     * @return キャンセル成功の場合 true
     */
    public boolean cancelOrder(String orderId) {
        for (Order order : orderList) {
            if (order.getOrderId().equals(orderId)) {
                order.cancel();
                sosakaisuu++;
                return true;
            }
        }
        return false;
    }

    // 規約違反(4)(5): メソッド名がローマ字かつ目的が不明瞭
    public int getSosakaisuu() {
        return sosakaisuu;
    }

    // 規約違反(10): Javadocなし
    public boolean data(String customerId) {
        return findOrdersByCustomer(customerId).isEmpty();
    }

    // 規約違反(8): 110文字を超える行
    public String buildOrderSummary(String customerId) {
        List<Order> orders = findOrdersByCustomer(customerId);
        return "顧客ID: " + customerId + " の注文件数: " + orders.size() + " 件 / 操作回数: " + sosakaisuu + " 回 / 最大注文金額上限: " + MAX_ORDER_AMOUNT + " 円";
    }
}
